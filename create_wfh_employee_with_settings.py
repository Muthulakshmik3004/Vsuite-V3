import sys
sys.path.append('backend')
from mongoengine import connect
from empmanage.models import Employee

# Connect to MongoDB using settings from backend
connect(
    db="employee_app",
    host="mongodb://localhost:27017/employee_app"
)

# Create WFH001 employee
employee = Employee(
    name="WFH Employee",
    emp_id="WFH001",
    role="Employee",
    gmail="wfh001@example.com",
    department="Software",
    password="wfh123",
    employment_type="WFH",
    home_lat=12.9716,
    home_lng=77.5946,
    home_verified=True
)
employee.save()
print("WFH001 employee created successfully!")