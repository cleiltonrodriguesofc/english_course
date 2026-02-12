from django.urls import path
from .views import (
    dashboard, lesson_1, lesson_2, lesson_3, lesson_4, quiz_view,
    register, login_view, logout_view, save_quiz_result,
    profile_view, game_puzzle, game_memory
)

urlpatterns = [
    path('', dashboard, name='dashboard'),
    path('lesson/1/', lesson_1, name='lesson_1'),
    path('lesson/2/', lesson_2, name='lesson_2'),
    path('lesson/3/', lesson_3, name='lesson_3'),
    path('lesson/4/', lesson_4, name='lesson_4'),
    path('quiz/', quiz_view, name='quiz'),
    path('register/', register, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('api/save-quiz/', save_quiz_result, name='save_quiz_result'),
    path('profile/', profile_view, name='profile'),
    path('game/puzzle/', game_puzzle, name='game_puzzle'),
    path('game/memory/', game_memory, name='game_memory'),
]
