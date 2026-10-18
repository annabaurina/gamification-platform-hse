from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import StudentViewSet, GroupViewSet, StudentGroupViewSet, DisciplineViewSet, CourseGroupViewSet, GradeViewSet, AttendanceViewSet, BonusEventViewSet, ProgressViewSet

router = DefaultRouter()
router.register(r'students', StudentViewSet)
router.register(r'groups', GroupViewSet)
router.register(r'student-groups', StudentGroupViewSet)
router.register(r'disciplines', DisciplineViewSet)
router.register(r'course-groups', CourseGroupViewSet)
router.register(r'grades', GradeViewSet, basename='grade')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'bonus-events', BonusEventViewSet, basename='bonus-event')
router.register(r'progress', ProgressViewSet, basename='progress')

token_oblain_view = TokenObtainPairView.as_view()
token_refresh_view = TokenRefreshView.as_view() 

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]