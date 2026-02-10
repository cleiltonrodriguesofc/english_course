from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from .models import QuizResult
import json

class EnglishCourseTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='password123')

    def test_dashboard_load(self):
        """Test if dashboard loads correctly."""
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'dashboard.html')

    def test_quiz_view_access(self):
        """Test if quiz page loads."""
        response = self.client.get(reverse('quiz'))
        self.assertEqual(response.status_code, 200)

    def test_register_view(self):
        """Test registration page load and content."""
        response = self.client.get(reverse('register'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'registration/register.html')
        self.assertContains(response, 'Username')
        self.assertContains(response, 'Password')
        self.assertNotContains(response, '{{ field.label }}')

    def test_login_view(self):
        """Test login page load."""
        response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'registration/login.html')

    def test_save_quiz_unauthenticated(self):
        """Test saving quiz result without login (should fail)."""
        data = {'score': 10, 'total': 20, 'quiz_name': 'test_quiz'}
        response = self.client.post(
            reverse('save_quiz_result'),
            json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)

    def test_save_quiz_authenticated(self):
        """Test saving quiz result with login (should succeed)."""
        self.client.login(username='testuser', password='password123')
        data = {'score': 15, 'total': 20, 'quiz_name': 'test_quiz'}
        response = self.client.post(
            reverse('save_quiz_result'),
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(QuizResult.objects.count(), 1)
        self.assertEqual(QuizResult.objects.first().score, 15)

    def test_dashboard_shows_best_score(self):
        """Test if dashboard shows the BEST score, not just the latest."""
        # Score 1: 5/10 (First attempt)
        QuizResult.objects.create(user=self.user, quiz_name='Class 3 Review', score=5, total_questions=10)
        
        # Score 2: 9/10 (Best attempt)
        QuizResult.objects.create(user=self.user, quiz_name='Class 3 Review', score=9, total_questions=10)

        # Score 3: 6/10 (Latest attempt, worse score)
        QuizResult.objects.create(user=self.user, quiz_name='Class 3 Review', score=6, total_questions=10)
        
        self.client.login(username='testuser', password='password123')
        response = self.client.get(reverse('dashboard'))
        
        self.assertIsNotNone(response.context['quiz_score'])
        # Should be 9, NOT 6
        self.assertEqual(response.context['quiz_score']['score'], 9)

    def test_profile_view_access(self):
        """Test profile page access and content."""
        # Unauthenticated -> Redirects to login
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, 302)

        # Authenticated -> 200 OK
        self.client.login(username='testuser', password='password123')
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'profile.html')
