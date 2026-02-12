from django.db import models
from django.contrib.auth.models import User


# Create your models here.


class Lesson(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    order = models.IntegerField(default=0)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.title


class LessonProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        unique_together = ('user', 'lesson')

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title}"


class QuizResult(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    quiz_name = models.CharField(max_length=100)  # e.g., 'pronouns'
    score = models.IntegerField()
    total_questions = models.IntegerField()
    date_taken = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.quiz_name}: {self.score}/{self.total_questions}"


class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=255)  # e.g., "Logged in", "Viewed Lesson 1"
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True, null=True)  # Optional JSON or text details

    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.timestamp}"
