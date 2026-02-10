FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project
COPY . /app/

# Expose port
EXPOSE 8000

# Run gunicorn (or runserver for now if gunicorn not fully configured in settings)
# Using runserver for simplicity as per "vibe coding" unless user asked for prod
# But the plan said gunicorn. I will use gunicorn but ensure it's installed.
# I added gunicorn to requirements.txt.
CMD ["gunicorn", "english_course.wsgi:application", "--bind", "0.0.0.0:8000"]
