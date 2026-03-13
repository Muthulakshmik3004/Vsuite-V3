#!/usr/bin/env python3
"""
Debug script to identify specific login issues
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://vdesk-backend.vienstereoptic.com"
API_BASE = f"{BASE_URL}/api-access"

def debug_login_issue():
    """Debug login issues step by step"""
    print("🔍 Debugging Login Issues")
    print("=" * 50)
    
    # Test 1: Check if server is responding
    print("1. Testing server response...")
    try:
        response = requests.get(BASE_URL, timeout=10)
        print(f"   Server Status: {response.status_code}")
        print(f"   Server Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Server Error: {e}")
        return
    
    # Test 2: Test login endpoint with different payloads
    print("\n2. Testing login endpoint...")
    
    test_cases = [
        {
            "name": "Empty payload",
            "data": {}
        },
        {
            "name": "Invalid credentials",
            "data": {"identifier": "invalid", "password": "invalid"}
        },
        {
            "name": "Admin credentials",
            "data": {"username": "admin", "password": "admin123"}
        },
        {
            "name": "Employee credentials",
            "data": {"identifier": "02", "password": "Muthu@2004"}
        },
        {
            "name": "Team Leader credentials",
            "data": {"emp_id": "TL001", "password": "password123"}
        }
    ]
    
    for test_case in test_cases:
        print(f"\n   Testing: {test_case['name']}")
        try:
            # Try different endpoints
            endpoints = [
                "/login/",
                "/admin-login/",
                "/teamleader-login/"
            ]
            
            for endpoint in endpoints:
                url = f"{API_BASE}{endpoint}"
                response = requests.post(url, json=test_case['data'], timeout=10)
                
                print(f"      {endpoint}: Status {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        result = response.json()
                        print(f"      Response: {json.dumps(result, indent=6)}")
                    except:
                        print(f"      Raw Response: {response.text[:300]}")
                elif response.status_code == 404:
                    print(f"      ❌ Endpoint not found")
                else:
                    print(f"      ⚠️  Status {response.status_code}: {response.text[:200]}")
                    
        except Exception as e:
            print(f"      ❌ Error: {e}")
    
    # Test 3: Check CORS and headers
    print("\n3. Testing CORS and headers...")
    try:
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Test Client)'
        }
        
        response = requests.options(f"{API_BASE}/login/", headers=headers, timeout=10)
        print(f"   OPTIONS Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
    except Exception as e:
        print(f"   ❌ CORS Test Error: {e}")
    
    # Test 4: Check if MongoDB is accessible
    print("\n4. Checking database connectivity...")
    print("   Note: This requires backend server to be running")
    print("   Check backend logs for MongoDB connection status")

def analyze_error_message():
    """Analyze the specific error message"""
    print("\n" + "=" * 60)
    print("📋 ERROR ANALYSIS")
    print("=" * 60)
    
    print("\n🚨 Current Error: 'Login Failed', err.response?.data?.message || 'Something went wrong'")
    print("\n💡 This error means:")
    print("1. Frontend is successfully connecting to the server")
    print("2. Server is responding with an error status")
    print("3. The server's error message is being displayed")
    
    print("\n🔧 Possible Causes:")
    print("1. Invalid credentials (most likely)")
    print("2. Database connection issues")
    print("3. User not found in database")
    print("4. Authentication system misconfiguration")
    
    print("\n📝 To Fix:")
    print("1. Verify you're using correct credentials")
    print("2. Check if users exist in the database")
    print("3. Ensure MongoDB is running and accessible")
    print("4. Check backend server logs for specific errors")

def provide_solutions():
    """Provide specific solutions"""
    print("\n" + "=" * 60)
    print("🛠️ SOLUTIONS")
    print("=" * 60)
    
    print("\n1. CHECK DEFAULT CREDENTIALS:")
    print("   Admin: username='admin', password='admin123'")
    print("   Employee: emp_id='02', password='Muthu@2004'")
    print("   Team Leader: emp_id='TL001', password='password123'")
    
    print("\n2. VERIFY DATABASE:")
    print("   # Check if users exist")
    print("   python manage.py shell")
    print("   >>> from empmanage.models import Employee, Admin, TeamLeader")
    print("   >>> Employee.objects.all().count()")
    print("   >>> Admin.objects.all().count()")
    print("   >>> TeamLeader.objects.all().count()")
    
    print("\n3. CHECK BACKEND LOGS:")
    print("   # Look for specific error messages")
    print("   python manage.py runserver")
    print("   # Watch for authentication errors")
    
    print("\n4. TEST WITH CURL:")
    print("   curl -X POST 'https://vdesk-backend.vienstereoptic.com/api/login/' \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -d '{\"identifier\":\"02\",\"password\":\"Muthu@2004\"}'")
    
    print("\n5. CHECK MONGODB:")
    print("   # Ensure MongoDB is running")
    print("   # Check connection string in backend/settings.py")
    print("   # Verify database name and credentials")

if __name__ == "__main__":
    debug_login_issue()
    analyze_error_message()
    provide_solutions()
    
    print("\n" + "=" * 60)
    print("🏁 Debug completed!")
    print("💡 Run this script to get detailed error information")
    print("=" * 60)