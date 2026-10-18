from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import (
    Attendance,
    BonusEvent,
    CourseGroup,
    Discipline,
    Grade,
    Group,
    Student,
    StudentGroup,
)


class UserSerializer(serializers.ModelSerializer):
    """Writable subset of Django's built-in User used by StudentSerializer.

    Password is accepted only on writes and is never returned in API responses.
    StudentSerializer hashes it with User.set_password/create_user.
    """

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
        trim_whitespace=False,
        min_length=8,
    )

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "password")
        read_only_fields = ("id",)

    def validate_password(self, value):
        try:
            validate_password(value, user=self.instance)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


class StudentSerializer(serializers.ModelSerializer):
    # Keep the response shape nested while allowing create/update of the related
    # Django user through the real User fields (username, first_name, last_name,
    # email, password). No password is ever included in a response.
    user = UserSerializer()
    full_name = serializers.SerializerMethodField(read_only=True)
    total_points = serializers.IntegerField(read_only=True)

    class Meta:
        model = Student
        fields = ("id", "user", "full_name", "total_points", "is_headman")
        read_only_fields = ("id", "full_name", "total_points")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Attach the nested serializer to the related User on updates so built-in
        # uniqueness validation (e.g. username) excludes the current account.
        if self.instance is not None and not isinstance(self.instance, (list, tuple)):
            self.fields["user"].instance = self.instance.user

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop("user")
        password = user_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({
                "user": {"password": "Это поле обязательно при создании студента."}
            })

        # create_user hashes the password; never assign it directly to User.password.
        user = User.objects.create_user(password=password, **user_data)
        return Student.objects.create(user=user, **validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        if user_data is not None:
            password = user_data.pop("password", None)
            user = instance.user
            for field, value in user_data.items():
                setattr(user, field, value)
            if password:
                user.set_password(password)
            user.save()

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class GroupSerializer(serializers.ModelSerializer):
    students_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Group
        fields = ("id", "name", "students_count")
        read_only_fields = ("id", "students_count")

    def get_students_count(self, obj):
        return (
            StudentGroup.objects.filter(group=obj)
            .values("student")
            .distinct()
            .count()
        )


class NestedPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """Accept a related object's integer PK but render it using a nested serializer.

    This preserves the existing read response (nested objects) and lets POST,
    PUT and PATCH use the real model relation names with numeric IDs, for example
    {"student": 12, "group": 3}. It does not add synthetic *_id fields.
    """

    def __init__(self, *args, **kwargs):
        self.serializer_class = kwargs.pop("serializer_class")
        super().__init__(*args, **kwargs)

    def use_pk_only_optimization(self):
        # Nested serializers need the full related model instance, not a PKOnlyObject.
        return False

    def to_representation(self, value):
        return self.serializer_class(value, context=self.context).data


class StudentGroupSerializer(serializers.ModelSerializer):
    student = NestedPrimaryKeyRelatedField(
        queryset=Student.objects.select_related("user"),
        serializer_class=StudentSerializer,
    )
    group = NestedPrimaryKeyRelatedField(
        queryset=Group.objects.all(),
        serializer_class=GroupSerializer,
    )

    class Meta:
        model = StudentGroup
        fields = ("id", "student", "group", "year")
        read_only_fields = ("id",)


class DisciplineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discipline
        fields = ("id", "name", "code")
        read_only_fields = ("id",)


class CourseGroupSerializer(serializers.ModelSerializer):
    discipline = NestedPrimaryKeyRelatedField(
        queryset=Discipline.objects.all(),
        serializer_class=DisciplineSerializer,
    )
    group = NestedPrimaryKeyRelatedField(
        queryset=Group.objects.all(),
        serializer_class=GroupSerializer,
    )
    module_display = serializers.CharField(source="get_module_display", read_only=True)

    class Meta:
        model = CourseGroup
        fields = ("id", "discipline", "group", "year", "module", "module_display")
        read_only_fields = ("id", "module_display")


class GradeSerializer(serializers.ModelSerializer):
    student = NestedPrimaryKeyRelatedField(
        queryset=Student.objects.select_related("user"),
        serializer_class=StudentSerializer,
    )
    course_group = NestedPrimaryKeyRelatedField(
        queryset=CourseGroup.objects.select_related("discipline", "group"),
        serializer_class=CourseGroupSerializer,
    )
    # The model's verbose_name documents the intended 0–10 grade scale.
    score = serializers.IntegerField(min_value=0, max_value=10)

    class Meta:
        model = Grade
        fields = ("id", "student", "course_group", "score", "date")
        read_only_fields = ("id", "date")


class GradeCreateSerializer(GradeSerializer):
    """Input/output serializer kept for compatibility with GradeViewSet.create."""

    class Meta(GradeSerializer.Meta):
        fields = ("id", "student", "course_group", "score", "date")
        read_only_fields = ("id", "date")


class AttendanceSerializer(serializers.ModelSerializer):
    student = NestedPrimaryKeyRelatedField(
        queryset=Student.objects.select_related("user"),
        serializer_class=StudentSerializer,
    )
    course_group = NestedPrimaryKeyRelatedField(
        queryset=CourseGroup.objects.select_related("discipline", "group"),
        serializer_class=CourseGroupSerializer,
    )

    class Meta:
        model = Attendance
        fields = ("id", "student", "course_group", "date", "is_present")
        read_only_fields = ("id",)


class AttendanceCreateSerializer(AttendanceSerializer):
    """Input/output serializer kept for compatibility with AttendanceViewSet."""

    class Meta(AttendanceSerializer.Meta):
        fields = ("id", "student", "course_group", "date", "is_present")
        read_only_fields = ("id",)


class BonusEventSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = BonusEvent
        fields = (
            "id",
            "student",
            "title",
            "description",
            "type",
            "type_display",
            "proof",
            "points_awarded",
            "status",
            "status_display",
            "admin_comment",
            "date",
            "reviewed_at",
        )
        read_only_fields = (
            "id",
            "student",
            "points_awarded",
            "status",
            "admin_comment",
            "date",
            "reviewed_at",
            "type_display",
            "status_display",
        )


class BonusEventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BonusEvent
        fields = ("id", "title", "description", "type", "proof")
        read_only_fields = ("id",)


class BonusEventReviewSerializer(serializers.Serializer):
    points_awarded = serializers.IntegerField(required=False, min_value=0)
    admin_comment = serializers.CharField(required=False, allow_blank=True)
