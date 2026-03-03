from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from .models import QuizResult, ActivityLog, Lesson
import json


class EnglishCourseTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="testuser", password="password123"
        )

    def test_dashboard_load(self):
        """Test if dashboard loads correctly."""
        response = self.client.get(reverse("dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "dashboard.html")

    def test_quiz_view_access(self):
        """Test if quiz page loads."""
        response = self.client.get(reverse("quiz"))
        self.assertEqual(response.status_code, 200)

    def test_register_view(self):
        """Test registration page load and content."""
        response = self.client.get(reverse("register"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "registration/register.html")
        self.assertContains(response, "Username")
        self.assertContains(response, "Password")
        self.assertNotContains(response, "{{ field.label }}")

    def test_login_view(self):
        """Test login page load."""
        response = self.client.get(reverse("login"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "registration/login.html")

    def test_save_quiz_unauthenticated(self):
        """Test saving quiz result without login (should fail)."""
        data = {"score": 10, "total": 20, "quiz_name": "test_quiz"}
        response = self.client.post(
            reverse("save_quiz_result"),
            json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_save_quiz_authenticated(self):
        """Test saving quiz result with login (should succeed)."""
        self.client.login(username="testuser", password="password123")
        data = {"score": 15, "total": 20, "quiz_name": "test_quiz"}
        response = self.client.post(
            reverse("save_quiz_result"),
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(QuizResult.objects.count(), 1)
        self.assertEqual(QuizResult.objects.first().score, 15)

    def test_dashboard_shows_best_score(self):
        """Test if dashboard shows the BEST score, not just the latest."""
        # Score 2: 9/10 (Best attempt)
        QuizResult.objects.create(
            user=self.user, quiz_name="Class 3 Review", score=9, total_questions=10
        )

        # Score 3: 6/10 (Latest attempt, worse score)
        QuizResult.objects.create(
            user=self.user, quiz_name="Class 3 Review", score=6, total_questions=10
        )

        self.client.login(username="testuser", password="password123")
        response = self.client.get(reverse("dashboard"))

        self.assertIsNotNone(response.context["quiz_score"])
        # Should be 9, NOT 6
        self.assertEqual(response.context["quiz_score"]["score"], 9)

    def test_profile_view_access(self):
        """Test profile page access and content."""
        # Unauthenticated -> Redirects to login
        response = self.client.get(reverse("profile"))
        self.assertEqual(response.status_code, 302)

        # Authenticated -> 200 OK
        self.client.login(username="testuser", password="password123")
        response = self.client.get(reverse("profile"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "profile.html")

    def test_puzzle_game_view(self):
        """Test puzzle game page load."""
        response = self.client.get(reverse("game_puzzle"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "game_puzzle.html")

    def test_lesson_6_view(self):
        """Test if Lesson 6 page loads."""
        response = self.client.get(reverse("lesson_6"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "lesson_6.html")

    def test_lesson_7_view(self):
        """Test if Lesson 7 page loads."""
        response = self.client.get(reverse("lesson_7"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "lesson_7.html")


class ActivityLogTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="testuser", password="password123"
        )

    def test_activity_log_creation(self):
        """Test creating an ActivityLog entry."""
        log = ActivityLog.objects.create(user=self.user, action="Test Action")
        self.assertEqual(str(log), f"testuser - Test Action - {log.timestamp}")

    def test_login_signal(self):
        """Test that login triggers an ActivityLog entry."""
        self.client.login(username="testuser", password="password123")
        # Check if log exists
        self.assertTrue(
            ActivityLog.objects.filter(user=self.user, action="Logged In").exists()
        )

    def test_logout_signal(self):
        """Test that logout triggers an ActivityLog entry."""
        self.client.login(username="testuser", password="password123")
        self.client.logout()
        self.assertTrue(
            ActivityLog.objects.filter(user=self.user, action="Logged Out").exists()
        )

    def test_view_logging(self):
        """Test that accessing views creates log entries."""
        self.client.login(username="testuser", password="password123")

        # Access Lesson 1
        self.client.get(reverse("lesson_1"))
        self.assertTrue(
            ActivityLog.objects.filter(
                user=self.user, action="Viewed Lesson 1"
            ).exists()
        )

        # Access Lesson 6
        self.client.get(reverse("lesson_6"))
        self.assertTrue(
            ActivityLog.objects.filter(
                user=self.user, action="Viewed Lesson 6 (Conversational Review)"
            ).exists()
        )

        # Access Puzzle Game
        self.client.get(reverse("game_puzzle"))
        self.assertTrue(
            ActivityLog.objects.filter(
                user=self.user, action="Played Puzzle Game"
            ).exists()
        )


class StaffAdminTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.staff_user = User.objects.create_user(
            username="staff", password="password123", is_staff=True
        )
        self.student_user = User.objects.create_user(
            username="student", password="password123", is_staff=False
        )
        # Create a lesson for progress tracking
        self.lesson = Lesson.objects.create(title="Lesson 1", slug="lesson-1", order=1)

    def test_staff_dashboard_access_denied_for_student(self):
        """Test that a regular student cannot access the staff dashboard."""
        self.client.login(username="student", password="password123")
        response = self.client.get(reverse("staff_dashboard"))
        # Should redirect to login (default behavior of staff_member_required)
        self.assertEqual(response.status_code, 302)
        self.assertTrue("login" in response.url)

    def test_staff_dashboard_access_allowed_for_staff(self):
        """Test that a staff user can access the staff dashboard."""
        self.client.login(username="staff", password="password123")
        response = self.client.get(reverse("staff_dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "staff_dashboard.html")

    def test_student_detail_access(self):
        """Test staff can view specific student details."""
        self.client.login(username="staff", password="password123")
        response = self.client.get(
            reverse("staff_student_detail", kwargs={"user_id": self.student_user.id})
        )
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "staff_student_detail.html")
        self.assertEqual(response.context["student"], self.student_user)
