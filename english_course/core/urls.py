from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('lesson/1/', views.lesson_1, name='lesson_1'),
    path('lesson/2/', views.lesson_2, name='lesson_2'),
    path('lesson-3/', views.lesson_3, name='lesson_3'),
    path('quiz/', views.quiz_view, name='quiz'),
]
