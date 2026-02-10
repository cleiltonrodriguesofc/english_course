from django.shortcuts import render


def dashboard(request):
    return render(request, 'dashboard.html')


def lesson_1(request):
    return render(request, 'lesson_1.html')


def lesson_2(request):
    return render(request, 'lesson_2.html')


def lesson_3(request):
    return render(request, 'lesson_3.html')

def quiz_view(request):
    return render(request, 'quiz.html')
