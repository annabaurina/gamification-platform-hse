from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Student, Group, StudentGroup, Discipline, CourseGroup, Grade, Attendance, BonusEvent


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email')


class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ('id', 'user', 'full_name', 'total_points', 'is_headman')

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

class GroupSerializer(serializers.ModelSerializer):
    students_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ('id', 'name', 'students_count')

    def get_students_count(self, obj):
        return StudentGroup.objects.filter(group=obj).values('student').distinct().count()


class StudentGroupSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    group = GroupSerializer(read_only=True)

    class Meta:
        model = StudentGroup
        fields = ('id', 'student', 'group', 'year')


class DisciplineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discipline
        fields = ('id', 'name', 'code')


class CourseGroupSerializer(serializers.ModelSerializer):
    discipline = DisciplineSerializer(read_only=True)
    group = GroupSerializer(read_only=True)
    module_display = serializers.CharField(source='get_module_display', read_only=True)

    class Meta:
        model = CourseGroup
        fields = ('id', 'discipline', 'group', 'year', 'module', 'module_display')


class GradeSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    course_group = CourseGroupSerializer(read_only=True)

    class Meta:
        model = Grade
        fields = ('id', 'student', 'course_group', 'score', 'date')


class GradeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = ('id', 'student', 'course_group', 'score')
        read_only_fields = ('id', 'date')


class AttendanceSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    course_group = CourseGroupSerializer(read_only=True)

    class Meta:
        model = Attendance
        fields = ('id', 'student', 'course_group', 'date', 'is_present')


class AttendanceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ('id', 'student', 'course_group', 'date', 'is_present')
        read_only_fields = ('id',)


class BonusEventSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = BonusEvent
        fields = (
            'id', 'student', 'title', 'description', 'type', 'type_display',
            'proof', 'points_awarded',
            'status', 'status_display', 'admin_comment',
            'date', 'reviewed_at'
        )
        read_only_fields = (
            'student', 'points_awarded', 'status',
            'admin_comment', 'reviewed_at'
        )

class BonusEventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BonusEvent
        fields = ('id', 'title', 'description', 'type', 'proof')
        read_only_fields = ('id',)


class BonusEventReviewSerializer(serializers.Serializer):
    points_awarded = serializers.IntegerField(required=False, min_value=0)
    admin_comment = serializers.CharField(required=False, allow_blank=True)