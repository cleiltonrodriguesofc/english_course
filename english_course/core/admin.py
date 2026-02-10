from django.contrib import admin
from .models import Lesson, LessonProgress, QuizResult

# Register your models here.
admin.site.register(Lesson)
admin.site.register(LessonProgress)
admin.site.register(QuizResult)
