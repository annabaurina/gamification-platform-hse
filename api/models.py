from django.db import models
from django.contrib.auth.models import User
from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


class Student(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student'
    )
    total_points = models.IntegerField(default=0, verbose_name="Всего бонусов")
    is_headman = models.BooleanField(default=False, verbose_name="Староста")

    def __str__(self):
        return self.user.get_full_name() or self.user.username

    class Meta:
        verbose_name = "Студент"
        verbose_name_plural = "Студенты"

class Group(models.Model):
    name = models.CharField(max_length=50, verbose_name="Название группы")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Учебная группа"
        verbose_name_plural = "Учебные группы"

class StudentGroup(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    year = models.IntegerField(verbose_name="Год обучения")

    class Meta:
        unique_together = ('student', 'group', 'year')
        verbose_name = "Студент в группе"
        verbose_name_plural = "Студенты в группах"

    def __str__(self):
        return f"{self.student} - {self.group} ({self.year})"

class Discipline(models.Model):
    name = models.CharField(max_length=200, verbose_name="Название дисциплины")
    code = models.CharField(max_length=20, blank=True, verbose_name="Код дисциплины")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Дисциплина"
        verbose_name_plural = "Дисциплины"

class CourseGroup(models.Model):
    discipline = models.ForeignKey(Discipline, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    year = models.IntegerField(verbose_name="Год обучения")
    module = models.PositiveSmallIntegerField(choices=[(1,'Модуль 1'), (2,'Модуль 2'), (3,'Модуль 3'), (4,'Модуль 4')], verbose_name="Модуль")

    class Meta:
        unique_together = ('discipline', 'group', 'year', 'module')
        verbose_name = "Курс"
        verbose_name_plural = "Курсы"

    def __str__(self):
        return f"{self.discipline} - {self.group} ({self.year}, {self.get_module_display()})"

class Grade(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grades')
    course_group = models.ForeignKey(CourseGroup, on_delete=models.CASCADE)
    score = models.PositiveSmallIntegerField(verbose_name="Оценка (0-10)")
    date = models.DateField(auto_now_add=True, verbose_name="Дата получения")

    def __str__(self):
        return f"{self.student}: {self.score}"

    class Meta:
        verbose_name = "Оценка"
        verbose_name_plural = "Оценки"

class Attendance(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendances')
    course_group = models.ForeignKey(CourseGroup, on_delete=models.CASCADE)
    date = models.DateField(verbose_name="Дата занятия")
    is_present = models.BooleanField(default=True, verbose_name="Присутствовал")

    class Meta:
        unique_together = ('student', 'course_group', 'date')
        verbose_name = "Посещаемость"
        verbose_name_plural = "Посещаемость"

    def __str__(self):
        status = "Присутствовал" if self.is_present else "Отсутствовал"
        return f"{self.student} - {self.course_group} ({self.date}) - {status}"

class BonusEvent(models.Model):
    TYPE_CHOICES = [
        ('event', 'Мероприятие'),
        ('olympiad', 'Олимпиада'),
        ('achievement', 'Достижение'),
        ('custom', 'Ручное начисление'),
    ]

    STATUS_CHOICES = [
        ('pending', 'На рассмотрении'),
        ('approved', 'Подтверждено'),
        ('rejected', 'Отклонено'),
    ]

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='bonus_events'
    )
    title = models.CharField(
        max_length=200,
        verbose_name="Название"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Описание"
    )
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='custom',
        verbose_name="Тип бонуса"
    )
    proof = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Подтверждение (ссылка)"
    )
    points_awarded = models.PositiveIntegerField(
        default=0,
        verbose_name="Начисленные баллы"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Статус"
    )
    admin_comment = models.TextField(
        blank=True,
        verbose_name="Комментарий администратора"
    )
    date = models.DateField(
        auto_now_add=True,
        verbose_name="Дата начисления"
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата рассмотрения"
    )

    def __str__(self):
        return f"{self.student} - {self.title} ({self.points_awarded})"

    class Meta:
        verbose_name = "Бонусное мероприятие"
        verbose_name_plural = "Бонусные мероприятия"
        ordering = ['-date']


def update_student_points(student_id):
    student = Student.objects.get(id=student_id)

    attendance_bonus = student.attendances.filter(is_present=True).count()

    event_bonus = student.bonus_events.filter(
        status='approved'
    ).aggregate(total=Sum('points_awarded'))['total'] or 0

    student.total_points = attendance_bonus + event_bonus
    student.save()


@receiver(post_save, sender=Attendance)
@receiver(post_delete, sender=Attendance)
def attendance_changed(sender, instance, **kwargs):
    update_student_points(instance.student.id)


@receiver(post_save, sender=Grade)
@receiver(post_delete, sender=Grade)
def grade_changed(sender, instance, **kwargs):
    update_student_points(instance.student.id)


@receiver(post_save, sender=BonusEvent)
@receiver(post_delete, sender=BonusEvent)
def bonus_changed(sender, instance, **kwargs):
    update_student_points(instance.student.id)