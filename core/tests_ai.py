from django.test import TestCase, Client
from django.urls import reverse
import json
from unittest.mock import patch

class AITutorTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_ai_tutor_page_renders(self):
        """Test if the AI Tutor page renders correctly."""
        response = self.client.get(reverse('ai_tutor'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'avatar_prototype.html')

    @patch('requests.post')
    def test_ai_tutor_chat_proxy(self, mock_post):
        """Test the AI Chat proxy view."""
        # Mocking the OpenAI API response
        mock_post.return_value.json.return_value = {
            "choices": [{"message": {"content": "Hello Word"}}]
        }
        mock_post.return_value.status_code = 200

        data = {"messages": [{"role": "user", "content": "Hi"}]}
        response = self.client.post(
            reverse('ai_tutor_chat'),
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['choices'][0]['message']['content'], "Hello Word")

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
