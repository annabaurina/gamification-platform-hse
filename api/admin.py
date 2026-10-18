from django.contrib import admin
from django.utils import timezone
from .models import (
    Group, Student, StudentGroup, Discipline,
    CourseGroup, Attendance, Grade, BonusEvent
)


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_points', 'is_headman')
    list_filter = ('is_headman',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')


@admin.register(StudentGroup)
class StudentGroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'group', 'year')
    list_filter = ('group', 'year')


@admin.register(Discipline)
class DisciplineAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code')
    search_fields = ('name', 'code')


@admin.register(CourseGroup)
class CourseGroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'discipline', 'group', 'year', 'module')
    list_filter = ('group', 'year', 'module')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'course_group', 'date', 'is_present')
    list_filter = ('is_present', 'date', 'course_group')


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'course_group', 'score', 'date')
    list_filter = ('course_group', 'score')


@admin.register(BonusEvent)
class BonusEventAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'student', 'title', 'type',
        'points_awarded', 'status', 'date', 'reviewed_at'
    )
    list_filter = ('status', 'type', 'date')
    search_fields = ('student__user__username', 'title', 'description')
    readonly_fields = ('date', 'reviewed_at')

    fieldsets = (
        ('Заявка', {
            'fields': ('student', 'title', 'description', 'type', 'proof')
        }),
        ('Решение администратора', {
            'fields': ('status', 'points_awarded', 'admin_comment', 'reviewed_at')
        }),
        ('Дата подачи', {
            'fields': ('date',),
            'classes': ('collapse',)
        }),
    )

    actions = ['approve_selected', 'reject_selected']

    def approve_selected(self, request, queryset):
        """Одобрить выбранные заявки (нужно проставить баллы вручную)"""
        updated = 0
        for bonus in queryset.filter(status='pending'):
            if bonus.points_awarded > 0:
                bonus.status = 'approved'
                bonus.reviewed_at = timezone.now()
                bonus.save()
                updated += 1
        self.message_user(
            request,
            f'Одобрено заявок: {updated}. '
            f'Остальные не одобрены — не указаны баллы.'
        )
    approve_selected.short_description = 'Одобрить выбранные (только с баллами)'

    def reject_selected(self, request, queryset):
        """Отклонить выбранные заявки"""
        updated = queryset.filter(status='pending').update(
            status='rejected',
            reviewed_at=timezone.now()
        )
        self.message_user(request, f'Отклонено заявок: {updated}')
    reject_selected.short_description = 'Отклонить выбранные'