from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import QuizResult, ActivityLog, Lesson, LessonProgress
from django.contrib.auth.models import User
from django.db.models import Avg, Count
from django.contrib.admin.views.decorators import staff_member_required


def log_activity(user, action, details=None):
    if user.is_authenticated:
        ActivityLog.objects.create(user=user, action=action, details=details)


def dashboard(request):
    quiz_score = None
    if request.user.is_authenticated:
        # Get best quiz score
        best_result = (
            QuizResult.objects.filter(user=request.user, quiz_name="Class 3 Review")
            .order_by("-score")
            .first()
        )
        if best_result:
            quiz_score = {
                "score": best_result.score,
                "total": best_result.total_questions,
                "percentage": int(
                    (best_result.score / best_result.total_questions) * 100
                ),
            }
    return render(request, "dashboard.html", {"quiz_score": quiz_score})


def lesson_1(request):
    log_activity(request.user, "Viewed Lesson 1")
    return render(request, "lesson_1.html")


def lesson_2(request):
    log_activity(request.user, "Viewed Lesson 2")
    return render(request, "lesson_2.html")


def lesson_3(request):
    log_activity(request.user, "Viewed Lesson 3")
    return render(request, "lesson_3.html")


def lesson_4(request):
    log_activity(request.user, "Viewed Lesson 4")
    return render(request, "lesson_4.html")


def lesson_5(request):
    log_activity(request.user, "Viewed Lesson 5")
    return render(request, "lesson_5.html")


def lesson_6(request):
    log_activity(request.user, "Viewed Lesson 6 (Conversational Review)")
    return render(request, "lesson_6.html")


def lesson_7(request):
    log_activity(request.user, "Viewed Lesson 7 (Time, Calendar & Dates)")
    return render(request, "lesson_7.html")


def quiz_view(request):
    return render(request, "quiz.html")


def register(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Registration successful!")
            return redirect("dashboard")
        else:
            messages.error(request, "Unsuccessful registration. Invalid information.")
    else:
        form = UserCreationForm()
    return render(request, "registration/register.html", {"form": form})


def login_view(request):
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get("username")
            password = form.cleaned_data.get("password")
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.info(request, f"You are now logged in as {username}.")
                return redirect("dashboard")
            else:
                messages.error(request, "Invalid username or password.")
        else:
            messages.error(request, "Invalid username or password.")
    else:
        form = AuthenticationForm()
    return render(request, "registration/login.html", {"form": form})


def logout_view(request):
    logout(request)
    messages.info(request, "You have successfully logged out.")
    return redirect("login")


@csrf_exempt
def save_quiz_result(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            score = data.get("score")
            total = data.get("total")
            quiz_name = data.get("quiz_name", "General")

            if request.user.is_authenticated:
                QuizResult.objects.create(
                    user=request.user,
                    score=score,
                    total_questions=total,
                    quiz_name=quiz_name,
                )
                return JsonResponse({"status": "success", "message": "Score saved!"})
            else:
                return JsonResponse(
                    {"status": "error", "message": "User not authenticated"}, status=401
                )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    return JsonResponse(
        {"status": "error", "message": "Invalid request method"}, status=405
    )


def profile_view(request):
    if not request.user.is_authenticated:
        return redirect("login")

    quiz_results = QuizResult.objects.filter(user=request.user).order_by("-date_taken")
    activities = ActivityLog.objects.filter(user=request.user).order_by("-timestamp")[
        :20
    ]

    return render(
        request,
        "profile.html",
        {"quiz_results": quiz_results, "activities": activities},
    )


def game_puzzle(request):
    log_activity(request.user, "Played Puzzle Game")
    return render(request, "game_puzzle.html")


def game_memory(request):
    log_activity(request.user, "Played Memory Game")
    return render(request, "game_memory.html")


@staff_member_required
def staff_dashboard(request):
    students = User.objects.filter(is_staff=False).annotate(
        quiz_count=Count("quizresult"), avg_score=Avg("quizresult__score")
    )

    total_students = students.count()
    lessons_count = Lesson.objects.count()

    student_data = []
    for student in students:
        completed_lessons = LessonProgress.objects.filter(
            user=student, completed=True
        ).count()
        progress_pct = (
            int((completed_lessons / lessons_count * 100)) if lessons_count > 0 else 0
        )

        student_data.append(
            {
                "user": student,
                "progress": progress_pct,
                "avg_score": student.avg_score or 0,
                "quiz_count": student.quiz_count,
                "last_login": student.last_login,
            }
        )

    context = {
        "total_students": total_students,
        "student_data": student_data,
    }
    return render(request, "staff_dashboard.html", context)


@staff_member_required
def staff_student_detail(request, user_id):
    student = User.objects.get(id=user_id)
    quiz_results = QuizResult.objects.filter(user=student).order_by("-date_taken")
    activities = ActivityLog.objects.filter(user=student).order_by("-timestamp")[:50]

    lessons = Lesson.objects.all().order_by("order")
    progress_data = []
    for lesson in lessons:
        is_completed = LessonProgress.objects.filter(
            user=student, lesson=lesson, completed=True
        ).exists()
        progress_data.append({"lesson": lesson, "completed": is_completed})

    context = {
        "student": student,
        "quiz_results": quiz_results,
        "activities": activities,
        "progress_data": progress_data,
    }
    return render(request, "staff_student_detail.html", context)
