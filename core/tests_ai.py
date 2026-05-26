from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.contrib.auth.models import User
import json
from unittest.mock import patch


class AITutorTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="testaiuser", password="password123"
        )
        self.client.login(username="testaiuser", password="password123")

    def test_ai_tutor_page_renders(self):
        """Test if the AI Tutor page renders correctly."""
        response = self.client.get(reverse('ai_tutor'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'avatar_prototype.html')

    @patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'})
    @patch('requests.post')
    def test_ai_tutor_chat_proxy(self, mock_post):
        """Test the AI Chat proxy view."""
        # Mocking the Gemini API response
        mock_post.return_value.json.return_value = {
            "candidates": [{"content": {"parts": [{"text": "Hello Word"}]}}]
        }
        mock_post.return_value.status_code = 200

        data = {"prompt": "Hi"}
        response = self.client.post(
            reverse('ai_tutor_chat'),
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['candidates'][0]['content']['parts'][0]['text'], "Hello Word")

    @override_settings(OPENAI_API_KEY="test-key")
    @patch('requests.post')
    def test_ai_tutor_tts_proxy(self, mock_post):
        """Test the AI TTS proxy view."""
        # Mocking binary audio data
        mock_post.return_value.content = b'fake_mp3_data'
        mock_post.return_value.status_code = 200

        data = {"input": "Hello"}
        response = self.client.post(
            reverse('ai_tutor_tts'),
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], "audio/mpeg")
        self.assertEqual(response.content, b'fake_mp3_data')

    def test_ai_proxy_methods(self):
        """Test that only POST is allowed on proxy views."""
        response_chat = self.client.get(reverse('ai_tutor_chat'))
        response_tts = self.client.get(reverse('ai_tutor_tts'))
        self.assertEqual(response_chat.status_code, 405)
        self.assertEqual(response_tts.status_code, 405)
