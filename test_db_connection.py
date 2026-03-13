#!/usr/bin/env python3
"""
Test script to verify MongoDB database connectivity
"""

import sys
import os
sys.path.append(os.path.abspath(''))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.backend.settings')
django.setup()

from backend.backend.settings import MONGO_URI, MONGO_DB_NAME

def test_mongodb_connection():
    """Test MongoDB connectivity"""
    print("🔍 Testing MongoDB Connection...")
    print(f"URI: {MONGO_URI}")
    print(f"DB Name: {MONGO_DB_NAME}")
    print("-" * 50)
    
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGO_URI)
        
        # Test connection
        db = client[MONGO_DB_NAME]
        
        # List collections
        collections = db.list_collection_names()
        print(f"✅ Successfully connected to MongoDB")
        print(f"📊 Database: {MONGO_DB_NAME}")
        print(f"📁 Collections: {len(collections)}")
        for collection in collections:
            count = db[collection].count_documents({})
            print(f"   - {collection}: {count} documents")
            
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ MongoDB Connection Error: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def test_mongoengine_connection():
    """Test MongoEngine ORM connection"""
    print("\n🔍 Testing MongoEngine ORM Connection...")
    print("-" * 50)
    
    try:
        from empmanage.models import Employee, TeamLeader, Admin
        from empmanage.models import LeaveRequest, PermissionRequest
        
        # Test Employee model
        employee_count = Employee.objects.count()
        print(f"✅ Employees: {employee_count}")
        
        # Test TeamLeader model
        teamleader_count = TeamLeader.objects.count()
        print(f"✅ TeamLeaders: {teamleader_count}")
        
        # Test Admin model
        admin_count = Admin.objects.count()
        print(f"✅ Admins: {admin_count}")
        
        # Test LeaveRequest model
        leave_count = LeaveRequest.objects.count()
        print(f"✅ Leave Requests: {leave_count}")
        
        # Test PermissionRequest model
        permission_count = PermissionRequest.objects.count()
        print(f"✅ Permission Requests: {permission_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ MongoEngine Connection Error: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def test_timesheet_model():
    """Test Timesheet model specifically"""
    print("\n🔍 Testing Timesheet Model...")
    print("-" * 50)
    
    try:
        from empmanage.models import Timesheet
        
        timesheet_count = Timesheet.objects.count()
        print(f"✅ Timesheets: {timesheet_count}")
        
        if timesheet_count > 0:
            sample = Timesheet.objects.first()
            print(f"📋 Sample Timesheet:")
            print(f"   Employee ID: {sample.employee_id}")
            print(f"   Date: {sample.date}")
            print(f"   Activities: {len(sample.activities)}")
            print(f"   Time Slots: {len(sample.time_slots)}")
            
        return True
        
    except Exception as e:
        print(f"❌ Timesheet Model Error: {e}")
        import traceback
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("🚀 Database Connectivity Test")
    print("=" * 50)
    
    mongo_success = test_mongodb_connection()
    print()
    
    if mongo_success:
        orm_success = test_mongoengine_connection()
        print()
        
        if orm_success:
            timesheet_success = test_timesheet_model()
            print()
            if timesheet_success:
                print("🎉 All database tests passed!")
            else:
                print("⚠️  Timesheet model tests failed")
        else:
            print("⚠️  MongoEngine ORM tests failed")
    else:
        print("⚠️  MongoDB connection tests failed")
    
    print()
    print("=" * 50)
    print("🏁 Test completed!")