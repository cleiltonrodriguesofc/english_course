from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import QuizResult, ActivityLog


def log_activity(user, action, details=None):
    if user.is_authenticated:
        ActivityLog.objects.create(user=user, action=action, details=details)


def dashboard(request):
    quiz_score = None
    if request.user.is_authenticated:
        # Get best quiz score
        best_result = QuizResult.objects.filter(
            user=request.user,
            quiz_name='Class 3 Review'
        ).order_by('-score').first()
        if best_result:
            quiz_score = {
                'score': best_result.score,
                'total': best_result.total_questions,
                'percentage': int((best_result.score / best_result.total_questions) * 100)
            }
    return render(request, 'dashboard.html', {'quiz_score': quiz_score})


def lesson_1(request):
    log_activity(request.user, "Viewed Lesson 1")
    return render(request, 'lesson_1.html')


def lesson_2(request):
    log_activity(request.user, "Viewed Lesson 2")
    return render(request, 'lesson_2.html')


def lesson_3(request):
    log_activity(request.user, "Viewed Lesson 3")
    return render(request, 'lesson_3.html')


def lesson_4(request):
    log_activity(request.user, "Viewed Lesson 4")
    return render(request, 'lesson_4.html')


def quiz_view(request):
    return render(request, 'quiz.html')


def register(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Registration successful!")
            return redirect('dashboard')
        else:
            messages.error(request, "Unsuccessful registration. Invalid information.")
    else:
        form = UserCreationForm()
    return render(request, 'registration/register.html', {'form': form})


def login_view(request):
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.info(request, f"You are now logged in as {username}.")
                return redirect('dashboard')
            else:
                messages.error(request, "Invalid username or password.")
        else:
            messages.error(request, "Invalid username or password.")
    else:
        form = AuthenticationForm()
    return render(request, 'registration/login.html', {'form': form})


def logout_view(request):
    logout(request)
    messages.info(request, "You have successfully logged out.")
    return redirect('login')


@csrf_exempt
def save_quiz_result(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            score = data.get('score')
            total = data.get('total')
            quiz_name = data.get('quiz_name', 'General')

            if request.user.is_authenticated:
                QuizResult.objects.create(
                    user=request.user,
                    score=score,
                    total_questions=total,
                    quiz_name=quiz_name
                )
                return JsonResponse({'status': 'success', 'message': 'Score saved!'})
            else:
                return JsonResponse({'status': 'error', 'message': 'User not authenticated'}, status=401)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)


def profile_view(request):
    if not request.user.is_authenticated:
        return redirect('login')

    quiz_results = QuizResult.objects.filter(user=request.user).order_by('-date_taken')
    activities = ActivityLog.objects.filter(user=request.user).order_by('-timestamp')[:20]

    return render(request, 'profile.html', {
        'quiz_results': quiz_results,
        'activities': activities
    })


def game_puzzle(request):
    log_activity(request.user, "Played Puzzle Game")
    return render(request, 'game_puzzle.html')


def game_memory(request):
    log_activity(request.user, "Played Memory Game")
    return render(request, 'game_memory.html')
