#!/usr/bin/env python3
"""
Comprehensive Project Analysis Script
Tests all major functionalities of the Employee App
"""
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def test_endpoint(name, url, method="GET", data=None, expected_status=200):
    """Test an endpoint and return results"""
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        elif method == "PUT":
            response = requests.put(url, json=data)
        
        success = response.status_code == expected_status
        print(f"✓ {name}: {response.status_code} {'✓' if success else '✗'}")
        if not success:
            print(f"  Expected: {expected_status}, Got: {response.status_code}")
            print(f"  Response: {response.text[:200]}...")
        return success, response
    except Exception as e:
        print(f"✗ {name}: Error - {e}")
        return False, None

def analyze_project():
    """Comprehensive analysis of all project functionalities"""
    print("=" * 60)
    print("COMPREHENSIVE EMPLOYEE APP PROJECT ANALYSIS")
    print("=" * 60)
    
    results = []
    
    # 1. Authentication & User Management
    print("\n1. AUTHENTICATION & USER MANAGEMENT")
    print("-" * 40)
    
    # Test login endpoints
    login_tests = [
        ("Admin Login", f"{BASE_URL}/admin-login/", "POST", {"username": "admin", "password": "admin123"}),
        ("Team Leader Login", f"{BASE_URL}/teamleader-login/", "POST", {"emp_id": "TL001", "password": "password123"}),
    ]
    
    for name, url, method, data in login_tests:
        success, response = test_endpoint(name, url, method, data)
        results.append((name, success))
    
    # 2. Job Sheet Functionality
    print("\n2. JOB SHEET FUNCTIONALITY")
    print("-" * 40)
    
    jobsheet_tests = [
        ("Admin Jobsheet Status", f"{BASE_URL}/jobsheet/admin/all/?user_id=admin", "GET"),
        ("Team Leader Review List", f"{BASE_URL}/jobsheet/review/?user_id=admin", "GET"),
        ("Job Sheet Detail", f"{BASE_URL}/jobsheet/6974760951e5f5a3bcbcf3b7/", "GET"),
    ]
    
    for name, url, method in jobsheet_tests:
        success, response = test_endpoint(name, url, method)
        results.append((name, success))
    
    # 3. Timesheet Functionality
    print("\n3. TIMESHEET FUNCTIONALITY")
    print("-" * 40)
    
    timesheet_tests = [
        ("Timesheet Day View", f"{BASE_URL}/timesheet/day/?employee_id=02&date=2025-12-23", "GET", None),
        ("Timesheet Summary", f"{BASE_URL}/timesheet/summary/?date=2025-12-23&employee_id=02", "GET", None),
        ("Timesheet Review", f"{BASE_URL}/timesheet/review/", "POST", {
            "employee_id": "02",
            "date": "2025-12-23",
            "status": "approved",
            "reviewer_id": "admin",
            "reviewer_name": "Admin"
        }),
    ]
    
    for name, url, method, data in timesheet_tests:
        success, response = test_endpoint(name, url, method, data)
        results.append((name, success))
    
    # 4. WFH Request Functionality
    print("\n4. WFH REQUEST FUNCTIONALITY")
    print("-" * 40)
    
    wfh_tests = [
        ("Get All WFH Requests", f"{BASE_URL}/wfh/admin/all/", "GET", None),
        ("Update WFH Status", f"{BASE_URL}/wfh/admin/update-status/", "POST", {
            "request_id": "test_id",
            "status": "Approved",
            "admin_id": "admin"
        }),
    ]
    
    for name, url, method, data in wfh_tests:
        success, response = test_endpoint(name, url, method, data, 200 if "Get" in name else 400)  # 400 expected for invalid request_id
        results.append((name, success))
    
    # 5. Permission & Leave Management
    print("\n5. PERMISSION & LEAVE MANAGEMENT")
    print("-" * 40)
    
    permission_tests = [
        ("Get Active Permissions", f"{BASE_URL}/permissions/active/02/", "GET", None),
        ("Get Active Leaves", f"{BASE_URL}/leaves/active/02/", "GET", None),
        ("User Requests", f"{BASE_URL}/user/requests/", "GET", None),
    ]
    
    for name, url, method, data in permission_tests:
        success, response = test_endpoint(name, url, method, data)
        results.append((name, success))
    
    # 6. Punch & Attendance
    print("\n6. PUNCH & ATTENDANCE")
    print("-" * 40)
    
    punch_tests = [
        ("Punch Dashboard", f"{BASE_URL}/punchin/dashboard/", "GET", None),
        ("Punch Records", f"{BASE_URL}/punch_records/", "GET", None),
        ("Site Sessions", f"{BASE_URL}/site-sessions/", "GET", None),
    ]
    
    for name, url, method, data in punch_tests:
        success, response = test_endpoint(name, url, method, data)
        results.append((name, success))
    
    # 7. Role-Based Access Control
    print("\n7. ROLE-BASED ACCESS CONTROL")
    print("-" * 40)
    
    access_tests = [
        ("Admin Access Test", f"{BASE_URL}/jobsheet/admin/all/?user_id=admin", "GET", None),
        ("Employee Access Denial", f"{BASE_URL}/jobsheet/review/?user_id=02", "GET", None),
        ("Team Leader Access Test", f"{BASE_URL}/jobsheet/review/?user_id=admin", "GET", None),
    ]
    
    for name, url, method, data in access_tests:
        success, response = test_endpoint(name, url, method, data)
        results.append((name, success))
    
    # 8. File Export Functionality
    print("\n8. FILE EXPORT FUNCTIONALITY")
    print("-" * 40)
    
    export_tests = [
        ("Timesheet PDF Export", f"{BASE_URL}/timesheet/export/pdf/?employee_id=02&date=2025-12-23", "GET", None),
        ("Timesheet Excel Export", f"{BASE_URL}/timesheet/export/excel/?employee_id=02&date=2025-12-23", "GET", None),
        ("Jobsheet PDF Export", f"{BASE_URL}/jobsheet/export/pdf/6974760951e5f5a3bcbcf3b7/", "GET", None),
    ]
    
    for name, url, method, data in export_tests:
        success, response = test_endpoint(name, url, method, data)
        results.append((name, success))
    
    # Summary
    print("\n" + "=" * 60)
    print("ANALYSIS SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    print("\nDetailed Results:")
    print("-" * 40)
    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{name:<35} {status}")
    
    # Functionality Status
    print("\n" + "=" * 60)
    print("FUNCTIONALITY STATUS")
    print("=" * 60)
    
    functionality_groups = {
        "Authentication": [name for name, _ in results if "Login" in name],
        "Job Sheets": [name for name, _ in results if "Job" in name or "Review" in name],
        "Timesheets": [name for name, _ in results if "Timesheet" in name],
        "WFH Requests": [name for name, _ in results if "WFH" in name],
        "Permissions/Leaves": [name for name, _ in results if "Permission" in name or "Leave" in name or "Request" in name],
        "Punch/Attendance": [name for name, _ in results if "Punch" in name or "Session" in name],
        "Access Control": [name for name, _ in results if "Access" in name or "Denial" in name],
        "File Export": [name for name, _ in results if "Export" in name or "PDF" in name or "Excel" in name]
    }
    
    for category, tests in functionality_groups.items():
        if tests:
            category_results = [success for name, success in results if name in tests]
            category_passed = sum(category_results)
            category_total = len(category_results)
            status = "✓ WORKING" if category_passed == category_total else "✗ ISSUES DETECTED"
            print(f"{category:<20} {status} ({category_passed}/{category_total})")
    
    print("\n" + "=" * 60)
    if passed == total:
        print("🎉 ALL FUNCTIONALITIES ARE WORKING CORRECTLY!")
        print("The Employee App project is fully functional.")
    else:
        print("⚠️  SOME ISSUES DETECTED")
        print("Please review the failed tests above.")
    print("=" * 60)

if __name__ == "__main__":
    analyze_project()