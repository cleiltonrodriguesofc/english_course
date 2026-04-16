import os
import django
from django.test import Client
from django.urls import reverse
from django.contrib.auth.models import User

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'english_course.settings')
django.setup()

def test_view():
    client = Client()
    # Create or get user for login
    user, created = User.objects.get_or_create(username='testuser')
    if created:
        user.set_password('password')
        user.save()
    
    client.login(username='testuser', password='password')
    
    # Test activity_review_3 view
    try:
        url = reverse('activity_review_3')
        print(f"Testing URL: {url}")
        response = client.get(url)
        
        if response.status_code == 200:
            print("SUCCESS: View activity_review_3 is working (Status 200)")
            if b"The Routine Architect" in response.content:
                print("SUCCESS: Template activity_review_3.html is rendering correctly")
            else:
                print("FAILURE: Template content not found")
        else:
            print(f"FAILURE: View returned status {response.status_code}")
            
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    test_view()
