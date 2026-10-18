from django.db import transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from drf_yasg.utils import swagger_auto_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated
from rest_framework.response import Response

from .models import (
    Attendance,
    BonusEvent,
    CourseGroup,
    Discipline,
    Grade,
    Group,
    Student,
    StudentGroup,
    update_student_points,
)
from .serializers import (
    AttendanceCreateSerializer,
    AttendanceSerializer,
    BonusEventCreateSerializer,
    BonusEventReviewSerializer,
    BonusEventSerializer,
    CourseGroupSerializer,
    DisciplineSerializer,
    GradeCreateSerializer,
    GradeSerializer,
    GroupSerializer,
    StudentGroupSerializer,
    StudentSerializer,
)


def _is_admin(user):
    """Use Django's explicit staff/superuser flags for administrative access."""
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or user.is_superuser)
    )


def _student_for_user(user):
    """Return the related Student profile without assuming every User has one."""
    if not user or not user.is_authenticated:
        return None
    try:
        return user.student
    except Student.DoesNotExist:
        return None


def _is_headman(user):
    student = _student_for_user(user)
    return bool(student and student.is_headman)


def _headman_group_year_pairs(user):
    """Groups/years this headman belongs to, based only on stored memberships."""
    student = _student_for_user(user)
    if not student or not student.is_headman:
        return set()
    return set(
        StudentGroup.objects.filter(student=student)
        .values_list("group_id", "year")
        .distinct()
    )


def _scope_to_headman_groups(queryset, user, relation="course_group"):
    """Filter a Grade/Attendance queryset to the headman's actual group/year pairs."""
    pairs = _headman_group_year_pairs(user)
    if not pairs:
        return queryset.none()

    scope = Q()
    for group_id, year in pairs:
        scope |= Q(**{
            f"{relation}__group_id": group_id,
            f"{relation}__year": year,
        })
    return queryset.filter(scope)


def _headman_can_manage_course_group(user, course_group):
    return (
        (course_group.group_id, course_group.year)
        in _headman_group_year_pairs(user)
    )


def _validate_student_course_membership(student, course_group):
    """A grade/attendance must belong to a student enrolled in that course group/year."""
    is_enrolled = StudentGroup.objects.filter(
        student=student,
        group=course_group.group,
        year=course_group.year,
    ).exists()
    if not is_enrolled:
        raise ValidationError({
            "student": (
                "Студент не состоит в учебной группе и учебном году, "
                "для которых создан этот курс."
            )
        })


def _validate_headman_course_scope(user, course_group):
    """A headman may manage records only for their assigned group/year."""
    if not _is_admin(user) and not _headman_can_manage_course_group(user, course_group):
        raise PermissionDenied(
            "Староста может изменять данные только своей учебной группы и года."
        )


class IsAdminUser(BasePermission):
    """Only Django staff/superusers may perform the operation."""

    def has_permission(self, request, view):
        return _is_admin(request.user)


class IsAuthenticatedAdminWrite(BasePermission):
    """Authenticated users may read; only admins may create/change/delete."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.method in SAFE_METHODS or _is_admin(request.user)


class IsHeadmanOrAdmin(BasePermission):
    """Writes are restricted to admins or users linked to a headman Student."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (_is_admin(request.user) or _is_headman(request.user))
        )


class LeaderboardStudentSerializer(serializers.ModelSerializer):
    """Minimal public student fields for the authenticated leaderboard."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ("id", "full_name", "total_points")
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class StudentViewSet(viewsets.ModelViewSet):
    """Admin CRUD; authenticated users get a minimal leaderboard list."""

    queryset = Student.objects.select_related("user").all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticatedAdminWrite]

    def get_queryset(self):
        queryset = Student.objects.select_related("user").all()
        if _is_admin(self.request.user):
            return queryset

        # The list is used by the leaderboard and exposes no email/username.
        if self.action == "list":
            return queryset

        # Do not allow a non-admin to retrieve another student's full profile.
        student = _student_for_user(self.request.user)
        return queryset.filter(pk=student.pk) if student else queryset.none()

    def get_serializer_class(self):
        if self.action == "list" and not _is_admin(self.request.user):
            return LeaderboardStudentSerializer
        return StudentSerializer

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """Return the authenticated account, its role, and linked student profile."""
        user = request.user
        student = _student_for_user(user)

        if _is_admin(user):
            role = "admin"
        elif student is not None and student.is_headman:
            role = "starosta"
        elif student is not None:
            role = "student"
        else:
            # A user without a student profile is not implicitly an administrator.
            role = "unassigned"

        return Response(
            {
                "user_id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "role": role,
                "student_id": student.id if student is not None else None,
                "student": (
                    StudentSerializer(
                        student,
                        context=self.get_serializer_context(),
                    ).data
                    if student is not None
                    else None
                ),
            },
            status=status.HTTP_200_OK,
        )


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticatedAdminWrite]


class StudentGroupViewSet(viewsets.ModelViewSet):
    """Admin CRUD; students may read only their own group memberships."""

    queryset = StudentGroup.objects.select_related("student__user", "group").all()
    serializer_class = StudentGroupSerializer
    permission_classes = [IsAuthenticatedAdminWrite]

    def get_queryset(self):
        queryset = StudentGroup.objects.select_related("student__user", "group").all()
        if _is_admin(self.request.user):
            return queryset
        student = _student_for_user(self.request.user)
        if student is None:
            return queryset.none()
        return queryset.filter(student=student)


class DisciplineViewSet(viewsets.ModelViewSet):
    queryset = Discipline.objects.all()
    serializer_class = DisciplineSerializer
    permission_classes = [IsAuthenticatedAdminWrite]


class CourseGroupViewSet(viewsets.ModelViewSet):
    queryset = CourseGroup.objects.select_related("discipline", "group").all()
    serializer_class = CourseGroupSerializer
    permission_classes = [IsAuthenticatedAdminWrite]


class GradeViewSet(viewsets.ModelViewSet):
    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsHeadmanOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Grade.objects.select_related(
            "student__user",
            "course_group__discipline",
            "course_group__group",
        )
        user = self.request.user

        if _is_admin(user):
            return queryset
        if _is_headman(user):
            return _scope_to_headman_groups(queryset, user)

        student = _student_for_user(user)
        return queryset.filter(student=student) if student else queryset.none()

    def get_serializer_class(self):
        if self.action == "create":
            return GradeCreateSerializer
        return GradeSerializer

    @swagger_auto_schema(request_body=GradeCreateSerializer)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def _validate_grade_relationships(self, user, student, course_group):
        _validate_student_course_membership(student, course_group)
        _validate_headman_course_scope(user, course_group)

    def perform_create(self, serializer):
        self._validate_grade_relationships(
            self.request.user,
            serializer.validated_data["student"],
            serializer.validated_data["course_group"],
        )
        serializer.save()

    def perform_update(self, serializer):
        student = serializer.validated_data.get("student", serializer.instance.student)
        course_group = serializer.validated_data.get(
            "course_group", serializer.instance.course_group
        )
        self._validate_grade_relationships(self.request.user, student, course_group)
        serializer.save()


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in (
            "create",
            "update",
            "partial_update",
            "destroy",
            "mark_group",
        ):
            return [IsHeadmanOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Attendance.objects.select_related(
            "student__user",
            "course_group__discipline",
            "course_group__group",
        )
        user = self.request.user

        if _is_admin(user):
            return queryset
        if _is_headman(user):
            return _scope_to_headman_groups(queryset, user)

        student = _student_for_user(user)
        return queryset.filter(student=student) if student else queryset.none()

    def get_serializer_class(self):
        if self.action == "create":
            return AttendanceCreateSerializer
        return AttendanceSerializer

    def _validate_attendance_relationships(self, user, student, course_group):
        _validate_student_course_membership(student, course_group)
        _validate_headman_course_scope(user, course_group)

    def perform_create(self, serializer):
        self._validate_attendance_relationships(
            self.request.user,
            serializer.validated_data["student"],
            serializer.validated_data["course_group"],
        )
        serializer.save()

    def perform_update(self, serializer):
        student = serializer.validated_data.get("student", serializer.instance.student)
        course_group = serializer.validated_data.get(
            "course_group", serializer.instance.course_group
        )
        self._validate_attendance_relationships(self.request.user, student, course_group)

        # Attendance signals recalculate the new student's points. If the record
        # is reassigned to another student, explicitly recalculate the old owner too.
        previous_student_id = serializer.instance.student_id
        with transaction.atomic():
            updated_attendance = serializer.save()
            if previous_student_id != updated_attendance.student_id:
                update_student_points(previous_student_id)

    @swagger_auto_schema(
        method="post",
        operation_description=(
            "Создаёт или обновляет посещаемость всех студентов, записанных "
            "в группу и учебный год выбранного курса. Тело: course_group_id, "
            "present_students (список ID присутствующих студентов)."
        ),
    )
    @action(detail=False, methods=["post"])
    def mark_group(self, request):
        course_group_id = request.data.get("course_group_id")
        if "present_students" not in request.data:
            return Response(
                {"error": "Необходимо передать present_students (список ID присутствующих студентов)"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        present_students = request.data.get("present_students")

        if (
            isinstance(course_group_id, bool)
            or not str(course_group_id or "").isdigit()
            or int(course_group_id) <= 0
        ):
            return Response(
                {"error": "course_group_id должен быть положительным ID курса"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(present_students, list):
            return Response(
                {"error": "present_students должен быть списком ID студентов"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if any(
            isinstance(student_id, bool)
            or not isinstance(student_id, int)
            or student_id <= 0
            for student_id in present_students
        ):
            return Response(
                {"error": "Все значения present_students должны быть положительными ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        course_group = get_object_or_404(
            CourseGroup.objects.select_related("group"),
            pk=int(course_group_id),
        )
        _validate_headman_course_scope(request.user, course_group)

        enrolled_ids = list(
            StudentGroup.objects.filter(
                group=course_group.group,
                year=course_group.year,
            ).values_list("student_id", flat=True)
        )
        enrolled_id_set = set(enrolled_ids)
        present_id_set = set(present_students)
        unknown_ids = present_id_set - enrolled_id_set
        if unknown_ids:
            return Response(
                {
                    "error": (
                        "В present_students есть студенты, не записанные "
                        "в выбранную учебную группу и год"
                    ),
                    "student_ids": sorted(unknown_ids),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.localdate()
        created_count = 0
        updated_count = 0
        with transaction.atomic():
            for student_id in enrolled_ids:
                is_present = student_id in present_id_set
                attendance, created = Attendance.objects.get_or_create(
                    student_id=student_id,
                    course_group=course_group,
                    date=today,
                    defaults={"is_present": is_present},
                )
                if created:
                    created_count += 1
                elif attendance.is_present != is_present:
                    attendance.is_present = is_present
                    attendance.save(update_fields=["is_present"])
                    updated_count += 1

        return Response(
            {
                "status": "ok",
                "created": created_count,
                "updated": updated_count,
                "total": len(enrolled_ids),
            },
            status=status.HTTP_200_OK,
        )


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return _student_for_user(request.user) is not None


class BonusEventViewSet(viewsets.ModelViewSet):
    serializer_class = BonusEventSerializer
    permission_classes = [IsAuthenticated]
    # Bonus requests are reviewed through explicit actions; no generic deletes.
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = BonusEvent.objects.select_related("student__user").all()
        if _is_admin(self.request.user):
            return queryset
        student = _student_for_user(self.request.user)
        return queryset.filter(student=student) if student else queryset.none()

    def get_permissions(self):
        if self.action in ("pending", "stats", "approve", "reject"):
            return [IsAdminUser()]
        if self.action in ("my", "create"):
            return [IsAuthenticated(), IsStudent()]
        return [IsAuthenticated()]

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Обновление заявки этим методом не поддерживается."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Используйте /approve/ или /reject/ для рассмотрения заявки."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Удаление бонусной заявки этим методом не поддерживается."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @swagger_auto_schema(request_body=BonusEventCreateSerializer)
    def create(self, request, *args, **kwargs):
        serializer = BonusEventCreateSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        bonus = serializer.save(
            student=_student_for_user(request.user),
            status="pending",
        )
        return Response(
            BonusEventSerializer(bonus, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["patch"])
    def approve(self, request, pk=None):
        serializer = BonusEventReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        points_awarded = serializer.validated_data.get("points_awarded")
        if points_awarded is None or points_awarded <= 0:
            return Response(
                {"error": "Необходимо указать points_awarded больше 0"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            bonus = get_object_or_404(
                BonusEvent.objects.select_for_update().select_related("student__user"),
                pk=pk,
            )
            if bonus.status != "pending":
                return Response(
                    {"error": "Заявка уже рассмотрена"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            bonus.status = "approved"
            bonus.points_awarded = points_awarded
            bonus.admin_comment = serializer.validated_data.get("admin_comment", "")
            bonus.reviewed_at = timezone.now()
            bonus.save(
                update_fields=[
                    "status",
                    "points_awarded",
                    "admin_comment",
                    "reviewed_at",
                ]
            )

        return Response(
            BonusEventSerializer(bonus, context=self.get_serializer_context()).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["patch"])
    def reject(self, request, pk=None):
        serializer = BonusEventReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            bonus = get_object_or_404(
                BonusEvent.objects.select_for_update().select_related("student__user"),
                pk=pk,
            )
            if bonus.status != "pending":
                return Response(
                    {"error": "Заявка уже рассмотрена"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            bonus.status = "rejected"
            bonus.admin_comment = serializer.validated_data.get("admin_comment", "")
            bonus.reviewed_at = timezone.now()
            bonus.save(update_fields=["status", "admin_comment", "reviewed_at"])

        return Response(
            BonusEventSerializer(bonus, context=self.get_serializer_context()).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def my(self, request):
        student = _student_for_user(request.user)
        bonuses = self.get_queryset().filter(student=student)
        return Response(
            BonusEventSerializer(
                bonuses,
                many=True,
                context=self.get_serializer_context(),
            ).data
        )

    @action(detail=False, methods=["get"])
    def pending(self, request):
        bonuses = self.get_queryset().filter(status="pending")
        return Response(
            BonusEventSerializer(
                bonuses,
                many=True,
                context=self.get_serializer_context(),
            ).data
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        approved = BonusEvent.objects.filter(status="approved")
        return Response(
            {
                "pending": BonusEvent.objects.filter(status="pending").count(),
                "approved": approved.count(),
                "rejected": BonusEvent.objects.filter(status="rejected").count(),
                "total_points_awarded": (
                    approved.aggregate(total=Sum("points_awarded"))["total"] or 0
                ),
            }
        )


class ProgressViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def my_progress(self, request):
        student = _student_for_user(request.user)
        if student is None:
            return Response(
                {"error": "У вас нет профиля студента"},
                status=status.HTTP_403_FORBIDDEN,
            )

        student_group = (
            StudentGroup.objects.select_related("group")
            .filter(student=student)
            .order_by("-year", "-id")
            .first()
        )
        if student_group is None:
            return Response(
                {
                    "coins": student.total_points,
                    "maxCoins": 100,
                    "percent": 0,
                    "level": "Нет группы",
                    "nextLevel": "Нет группы",
                    "coinsToNextLevel": 0,
                    "bestStudent": "Нет данных",
                    "error": "Студент не привязан к группе",
                },
                status=status.HTTP_200_OK,
            )

        peer_ids = StudentGroup.objects.filter(
            group=student_group.group,
            year=student_group.year,
        ).values_list("student_id", flat=True)
        best_student = (
            Student.objects.select_related("user")
            .filter(id__in=peer_ids)
            .order_by("-total_points", "id")
            .first()
        )
        max_coins = best_student.total_points if best_student else 0
        if max_coins <= 0:
            max_coins = 20

        step = max(1, max_coins // 3)
        levels = [
            {"name": "Новичок", "threshold": 0},
            {"name": "Академик", "threshold": step},
            {"name": "Победитель", "threshold": step * 2},
        ]
        coins = student.total_points
        current_level = levels[0]
        next_level = levels[1]
        for index, level in enumerate(levels):
            if coins >= level["threshold"]:
                current_level = level
                next_level = levels[index + 1] if index + 1 < len(levels) else None

        coins_to_next = max(0, next_level["threshold"] - coins) if next_level else 0
        percent = min(100.0, coins / max_coins * 100) if max_coins else 0
        best_name = "Нет данных"
        if best_student:
            best_name = best_student.user.get_full_name() or best_student.user.username

        return Response(
            {
                "coins": coins,
                "maxCoins": max_coins,
                "percent": round(percent, 1),
                "level": current_level["name"],
                "nextLevel": next_level["name"] if next_level else "Максимум",
                "coinsToNextLevel": coins_to_next,
                "bestStudent": best_name,
            },
            status=status.HTTP_200_OK,
        )
