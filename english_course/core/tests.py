from django.test import TestCase
from django.urls import reverse


class ViewTests(TestCase):
    def test_dashboard_view(self):
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'dashboard.html')
        self.assertContains(response, 'English Course')

    def test_lesson_1_view(self):
        response = self.client.get(reverse('lesson_1'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'lesson_1.html')
        self.assertContains(response, 'Lesson 1')

    def test_lesson_2_view(self):
        response = self.client.get(reverse('lesson_2'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'lesson_2.html')
        self.assertContains(response, 'Lesson 2')

    def test_lesson_3_view(self):
        response = self.client.get(reverse('lesson_3'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'lesson_3.html')
        self.assertContains(response, 'Lesson 3')
