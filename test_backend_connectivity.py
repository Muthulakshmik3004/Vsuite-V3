#!/usr/bin/env python3
"""
Test script to verify backend connectivity and API endpoints
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://vsuite-backend.vienstereoptic.com"
API_BASE = f"{BASE_URL}/api"

def test_connectivity():
    """Test basic connectivity to the backend server"""
    print("🔍 Testing Backend Connectivity...")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print("-" * 50)
    
    try:
        # Test 1: Check if server is accessible
        print("1. Testing server accessibility...")
        response = requests.get(BASE_URL, timeout=10)
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Server is accessible")
        else:
            print(f"   ❌ Server returned status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection Error: Server is not accessible")
        print("   💡 This means the backend server is not running or not deployed")
        return False
    except requests.exceptions.Timeout:
        print("   ❌ Timeout Error: Server is not responding")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected Error: {e}")
        return False
    
    # Test 2: Check API endpoints
    print("\n2. Testing API endpoints...")
    
    endpoints = [
        "/login/",
        "/admin-login/",
        "/teamleader-login/",
        "/signup/"
    ]
    
    for endpoint in endpoints:
        try:
            url = f"{API_BASE}{endpoint}"
            print(f"   Testing {endpoint}...")
            response = requests.post(url, json={}, timeout=5)
            print(f"      Status: {response.status_code}")
            
            if response.status_code == 404:
                print(f"      ❌ Endpoint not found (404)")
            elif response.status_code == 405:
                print(f"      ✅ Endpoint exists (Method Not Allowed - expected for POST without data)")
            elif response.status_code == 200:
                print(f"      ✅ Endpoint accessible")
            else:
                print(f"      ⚠️  Unexpected status: {response.status_code}")
                
        except Exception as e:
            print(f"      ❌ Error: {e}")
    
    # Test 3: Test with sample data
    print("\n3. Testing login with sample data...")
    try:
        login_data = {
            "identifier": "test_user",
            "password": "test_password"
        }
        
        response = requests.post(f"{API_BASE}/login/", json=login_data, timeout=5)
        print(f"   Login Test Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Login endpoint is working")
            try:
                result = response.json()
                print(f"   Response: {json.dumps(result, indent=2)}")
            except:
                print(f"   Raw Response: {response.text[:200]}")
        elif response.status_code == 404:
            print("   ❌ Login endpoint not found")
        else:
            print(f"   ⚠️  Login endpoint returned status {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Login test failed: {e}")
    
    return True

def diagnose_issues():
    """Provide diagnosis and solutions"""
    print("\n" + "="*60)
    print("📋 DIAGNOSIS & SOLUTIONS")
    print("="*60)
    
    print("\n🚨 CURRENT STATUS: Backend server is returning 500 Internal Server Error")
    print("\n💡 PROBABLE CAUSES:")
    print("1. Backend server is running but has internal errors")
    print("2. Database connection issues")
    print("3. Application code errors")
    print("4. Configuration errors")
    
    print("\n🔧 SOLUTION STEPS:")
    print("\n1. CHECK SERVER LOGS:")
    print("   - Check Django logs for errors")
    print("   - Check nginx logs for proxy issues")
    print("   - Check system logs for deployment issues")
    
    print("\n2. VERIFY DATABASE CONNECTIVITY:")
    print("   - Check MongoDB connection")
    print("   - Verify database credentials")
    print("   - Check if database is running")
    
    print("\n3. TEST LOCALLY FIRST:")
    print("   - Run backend on localhost:8000")
    print("   - Test API endpoints with curl/postman")
    print("   - Verify database connectivity")
    
    print("\n4. UPDATE FRONTEND CONFIG:")
    print("   - Ensure config.js points to correct backend URL")
    print("   - Test with both localhost and production URLs")

if __name__ == "__main__":
    print("🚀 Backend Connectivity Test")
    print("="*50)
    
    success = test_connectivity()
    
    if not success:
        diagnose_issues()
    
    print("\n" + "="*50)
    print("🏁 Test completed!")