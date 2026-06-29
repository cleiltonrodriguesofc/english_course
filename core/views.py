from django.shortcuts import render, redirect
from django.conf import settings
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
from django.contrib.auth.decorators import login_required
import requests


def log_activity(user, action, details=None):
    if user.is_authenticated:
        ActivityLog.objects.create(user=user, action=action, details=details)


@login_required
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


@login_required
def lesson_1(request):
    log_activity(request.user, "Viewed Lesson 1")
    return render(request, "lesson_1.html")


@login_required
def lesson_2(request):
    log_activity(request.user, "Viewed Lesson 2")
    return render(request, "lesson_2.html")


@login_required
def lesson_3(request):
    log_activity(request.user, "Viewed Lesson 3")
    return render(request, "lesson_3.html")


@login_required
def lesson_4(request):
    log_activity(request.user, "Viewed Lesson 4")
    return render(request, "lesson_4.html")


@login_required
def lesson_5(request):
    log_activity(request.user, "Viewed Lesson 5")
    return render(request, "lesson_5.html")


@login_required
def lesson_6(request):
    log_activity(request.user, "Viewed Lesson 6 (Conversational Review)")
    return render(request, "lesson_6.html")


@login_required
def lesson_7(request):
    log_activity(request.user, "Viewed Lesson 7 (Time, Calendar & Dates)")
    return render(request, "lesson_7.html")


@login_required
def lesson_8(request):
    log_activity(request.user, "Viewed Lesson 8 (Numbers, Dates & Time)")
    return render(request, "lesson_8.html")


@login_required
def lesson_9(request):
    log_activity(request.user, "Viewed Lesson 9 (Daily Routine)")
    return render(request, "lesson_9.html")


@login_required
def lesson_10(request):
    log_activity(request.user, "Viewed Lesson 10 (Likes & Dislikes)")
    return render(request, "lesson_10.html")


@login_required
def lesson_11(request):
    log_activity(request.user, "Viewed Lesson 11 (City & Transportation)")
    return render(request, "lesson_11.html")


@login_required
def lesson_12(request):
    log_activity(request.user, "Viewed Lesson 12 (Family & Appearance)")
    return render(request, "lesson_12.html")


@login_required
def lesson_13(request):
    log_activity(request.user, "Viewed Lesson 13 (Clothes & Colors)")
    return render(request, "lesson_13.html")


@login_required
def lesson_14(request):
    log_activity(request.user, "Viewed Lesson 14 (Food & Drinks)")
    return render(request, "lesson_14.html")


@login_required
def lesson_15(request):
    log_activity(request.user, "Viewed Lesson 15 (Demonstrative Pronouns)")
    return render(request, "lesson_15.html")


@login_required
def lesson_review_1(request):
    log_activity(request.user, "Viewed Drill 1: Identity & Introductions")
    return render(request, "lesson_review_1.html")


@login_required
def lesson_review_2(request):
    log_activity(request.user, "Viewed Drill 2: The Answer Engine")
    return render(request, "lesson_review_2.html")


@login_required
def lesson_review_3(request):
    log_activity(request.user, "Viewed Drill 3: Action Engine (Routine)")
    return render(request, "lesson_review_3.html")


@login_required
def lesson_review_4(request):
    log_activity(request.user, "Viewed Lesson Review 4 (The 3rd Person S Wall)")
    return render(request, "lesson_review_4.html")


@login_required
def lesson_review_5(request):
    log_activity(request.user, "Viewed Lesson Review 5 (Simple Inquiries Do You)")
    return render(request, "lesson_review_5.html")


@login_required
def lesson_review_6(request):
    log_activity(request.user, "Viewed Lesson Review 6 (Simple Inquiries Does She)")
    return render(request, "lesson_review_6.html")


@login_required
def lesson_review_7(request):
    log_activity(request.user, "Viewed Lesson Review 7 (Complete Fluency Loop)")
    return render(request, "lesson_review_7.html")


@login_required
def activity_review_1(request):
    log_activity(request.user, "Started Activity Review 1: Spy Agency")
    return render(request, "activity_review_1.html")


@login_required
def activity_review_2(request):
    log_activity(request.user, "Started Activity Review 2: The Answer Engine")
    return render(request, "activity_review_2.html")


@login_required
def activity_review_3(request):
    log_activity(request.user, "Started Activity Review 3: The Routine Architect")
    return render(request, "activity_review_3.html")


@login_required
def activity_review_4(request):
    log_activity(request.user, "Started Activity Review 4: The 3rd Person Wall")
    return render(request, "activity_review_4.html")


@login_required
def activity_review_5(request):
    log_activity(request.user, "Started Activity Review 5: Simple Inquiries")
    return render(request, "activity_review_5.html")


@login_required
def activity_review_6(request):
    log_activity(request.user, "Started Activity Review 6: Time Master")
    return render(request, "activity_review_6.html")


@login_required
def activity_review_7(request):
    log_activity(request.user, "Started Activity Review 7: The Routine Architect")
    return render(request, "activity_review_7.html")


@login_required
def activity_review_8(request):
    log_activity(request.user, "Started Activity Review 8: City Navigator")
    return render(request, "activity_review_8.html")


@login_required
def activity_review_9(request):
    log_activity(request.user, "Started Activity Review 9: Food & Fashion")
    return render(request, "activity_review_9.html")


@login_required
def activity_review_10(request):
    log_activity(request.user, "Started Activity Review 10: The House Explorer")
    return render(request, "activity_review_10.html")


@login_required
def activity_conversation_2(request):
    log_activity(request.user, "Started Advanced Conversation 2")
    return render(request, "activity_conversation_2.html")


@login_required
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


@login_required
def game_puzzle(request):
    log_activity(request.user, "Played Puzzle Game")
    return render(request, "game_puzzle.html")


@login_required
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


@login_required
@csrf_exempt
def ai_tutor_chat(request):
    """
    Proxy for Gemini Chat Completions API.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        prompt = data.get("prompt", "")

        from decouple import config
        api_key = config("GEMINI_API_KEY", default="")
        
        if not api_key:
            return JsonResponse({"error": {"message": "GEMINI_API_KEY not configured"}})

        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
        
        response = requests.post(
            gemini_url,
            headers={
                "Content-Type": "application/json",
            },
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2
                }
            },
            timeout=30
        )

        if response.status_code == 200:
            return JsonResponse(response.json())
        else:
            return JsonResponse({"error": {"message": f"Gemini API Error: {response.text}"}})

    except Exception as e:
        return JsonResponse({"error": {"message": str(e)}})


@login_required
@csrf_exempt
def ai_tutor_tts(request):
    """
    Proxy for OpenAI TTS API.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        text = data.get("input", "")

        api_key = getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            return JsonResponse({"error": "API Key not configured"}, status=500)

        response = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "tts-1",
                "voice": "nova",
                "input": text,
            },
            timeout=30
        )

        if response.status_code == 200:
            from django.http import HttpResponse
            return HttpResponse(response.content, content_type="audio/mpeg")
        else:
            return JsonResponse(response.json(), status=response.status_code)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def ai_tutor(request):
    """
    Renders the AI Tutor (Maria) prototype page.
    """
    import os
    from django.conf import settings
    try:
        img_path = os.path.join(settings.BASE_DIR, "core", "templates", "img_tag.txt")
        with open(img_path, "r") as f:
            avatar_img_tag = f.read().strip()
    except Exception:
        avatar_img_tag = "👩‍🏫"

    return render(request, "avatar_prototype.html", {"avatar_img_tag": avatar_img_tag})


@login_required
def activity_isabelle_chat(request):
    log_activity(request.user, "Started Activity: Isabelle Conversation Game")
    return render(request, "activity_isabelle_chat.html")
