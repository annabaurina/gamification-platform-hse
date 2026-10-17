from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.utils import timezone
from django.db.models import Max, Sum
from drf_yasg.utils import swagger_auto_schema


from .models import (
    Student, Group, StudentGroup, Discipline,
    CourseGroup, Grade, Attendance, BonusEvent
)
from .serializers import (
    StudentSerializer, GroupSerializer, StudentGroupSerializer,
    DisciplineSerializer, CourseGroupSerializer,
    GradeSerializer, AttendanceSerializer, BonusEventSerializer, BonusEventCreateSerializer, BonusEventReviewSerializer, GradeCreateSerializer,
)

class IsHeadmanOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True
        if hasattr(user, 'student') and user.student.is_headman:
            return True
        return False

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]


class StudentGroupViewSet(viewsets.ModelViewSet):
    queryset = StudentGroup.objects.all()
    serializer_class = StudentGroupSerializer
    permission_classes = [IsAuthenticated]


class DisciplineViewSet(viewsets.ModelViewSet):
    queryset = Discipline.objects.all()
    serializer_class = DisciplineSerializer
    permission_classes = [IsAuthenticated]


class CourseGroupViewSet(viewsets.ModelViewSet):
    queryset = CourseGroup.objects.all()
    serializer_class = CourseGroupSerializer
    permission_classes = [IsAuthenticated]


class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsHeadmanOrAdmin()]
        return [IsAuthenticated()]

    @swagger_auto_schema(request_body=GradeCreateSerializer)
    def create(self, request, *args, **kwargs):
        serializer = GradeCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'mark_group':
            return [IsAuthenticated(), IsHeadmanOrAdmin()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'])
    def mark_group(self, request):
        course_group_id = request.data.get('course_group_id')
        present_students = request.data.get('present_students', [])

        if not course_group_id:
            return Response(
                {'error': 'Не указан курс'},
                status=status.HTTP_400_BAD_REQUEST
            )

        course_group = CourseGroup.objects.get(id=course_group_id)
        student_ids = StudentGroup.objects.filter(
            group=course_group.group,
            year=course_group.year
        ).values_list('student_id', flat=True)

        created_count = 0
        today = timezone.now().date()

        for student_id in student_ids:
            is_present = student_id in present_students
            attendance, created = Attendance.objects.get_or_create(
                student_id=student_id,
                course_group_id=course_group_id,
                date=today,
                defaults={'is_present': is_present}
            )
            if created:
                created_count += 1
            elif attendance.is_present != is_present:
                attendance.is_present = is_present
                attendance.save()

        return Response({
            'status': 'ok',
            'created': created_count,
            'total': len(student_ids)
        })


class BonusEventViewSet(viewsets.ModelViewSet):
    queryset = BonusEvent.objects.all()
    serializer_class = BonusEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'student'):
            return BonusEvent.objects.filter(student=user.student)
        return BonusEvent.objects.all()

    
    @swagger_auto_schema(request_body=BonusEventCreateSerializer)
    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, 'student'):
            return Response(
                {'error': 'Только студент может подать заявку'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = BonusEventCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                student=request.user.student,
                status='pending'
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        if hasattr(request.user, 'student'):
            return Response(
                {'error': 'Только админ может одобрять заявки'},
                status=status.HTTP_403_FORBIDDEN
            )

        bonus = self.get_object()

        if bonus.status != 'pending':
            return Response(
                {'error': 'Заявка уже рассмотрена'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = BonusEventReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        points_awarded = serializer.validated_data.get('points_awarded', 0)
        admin_comment = serializer.validated_data.get('admin_comment', '')

        if points_awarded <= 0:
            return Response(
                {'error': 'Необходимо указать количество баллов больше 0'},
                status=status.HTTP_400_BAD_REQUEST
            )

        bonus.status = 'approved'
        bonus.points_awarded = points_awarded
        bonus.admin_comment = admin_comment
        bonus.reviewed_at = timezone.now()
        bonus.save()

        return Response(BonusEventSerializer(bonus).data)

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        """Админ отклоняет заявку"""
        if hasattr(request.user, 'student'):
            return Response(
                {'error': 'Только админ может отклонять заявки'},
                status=status.HTTP_403_FORBIDDEN
            )

        bonus = self.get_object()

        if bonus.status != 'pending':
            return Response(
                {'error': 'Заявка уже рассмотрена'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = BonusEventReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        bonus.status = 'rejected'
        bonus.admin_comment = serializer.validated_data.get('admin_comment', '')
        bonus.reviewed_at = timezone.now()
        bonus.save()

        return Response(BonusEventSerializer(bonus).data)

    @action(detail=False, methods=['get'])
    def my(self, request):
        """Студент видит свои заявки"""
        if not hasattr(request.user, 'student'):
            return Response(
                {'error': 'Только студент имеет заявки'},
                status=status.HTTP_403_FORBIDDEN
            )

        bonuses = BonusEvent.objects.filter(student=request.user.student)
        serializer = BonusEventSerializer(bonuses, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Админ видит все заявки на рассмотрении"""
        if hasattr(request.user, 'student'):
            return Response(
                {'error': 'Только админ может видеть заявки'},
                status=status.HTTP_403_FORBIDDEN
            )

        bonuses = BonusEvent.objects.filter(status='pending')
        serializer = BonusEventSerializer(bonuses, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Статистика по заявкам (для админа)"""
        if hasattr(request.user, 'student'):
            return Response(
                {'error': 'Только админ может видеть статистику'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            'pending': BonusEvent.objects.filter(status='pending').count(),
            'approved': BonusEvent.objects.filter(status='approved').count(),
            'rejected': BonusEvent.objects.filter(status='rejected').count(),
            'total_points_awarded': BonusEvent.objects.filter(
                status='approved'
            ).aggregate(total=Sum('points_awarded'))['total'] or 0,
        })

class ProgressViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def my_progress(self, request):
        user = request.user

        if not hasattr(user, 'student'):
            return Response({
                'coins': 0,
                'maxCoins': 100,
                'percent': 0,
                'level': 'Нет данных',
                'nextLevel': 'Нет данных',
                'coinsToNextLevel': 0,
                'bestStudent': 'Нет данных',
                'error': 'У вас нет профиля студента'
            }, status=status.HTTP_400_BAD_REQUEST)

        student = user.student

        student_group = StudentGroup.objects.filter(student=student).first()
        
        if not student_group:
            return Response({
                'coins': student.total_points,
                'maxCoins': 100,
                'percent': 0,
                'level': 'Нет группы',
                'nextLevel': 'Нет группы',
                'coinsToNextLevel': 0,
                'bestStudent': 'Нет данных',
                'error': 'Студент не привязан к группе'
            }, status=status.HTTP_400_BAD_REQUEST)

        group = student_group.group

        student_groups_in_group = StudentGroup.objects.filter(group=group)
        student_ids = student_groups_in_group.values_list('student_id', flat=True)

        best_student = Student.objects.filter(id__in=student_ids).order_by('-total_points').first()
        max_coins = best_student.total_points if best_student else 0

        if max_coins == 0:
            max_coins = 20

        step = max_coins // 3

        levels = [
            {'name': 'Новичок', 'threshold': 0},
            {'name': 'Академик', 'threshold': step},
            {'name': 'Победитель', 'threshold': step * 2},
        ]

        coins = student.total_points
        current_level = levels[0]
        next_level = levels[1] if len(levels) > 1 else None

        for i, level in enumerate(levels):
            if coins >= level['threshold']:
                current_level = level
                next_level = levels[i + 1] if i + 1 < len(levels) else None

        if next_level:
            coins_to_next = next_level['threshold'] - coins
            if coins_to_next < 0:
                coins_to_next = 0
        else:
            coins_to_next = 0

        percent = (coins / max_coins) * 100 if max_coins > 0 else 0

        return Response({
            'coins': coins,
            'maxCoins': max_coins,
            'percent': round(percent, 1),
            'level': current_level['name'],
            'nextLevel': next_level['name'] if next_level else 'Максимум',
            'coinsToNextLevel': coins_to_next,
            'bestStudent': best_student.user.get_full_name() if best_student else 'Нет данных',
        })

