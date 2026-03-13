import sys
sys.path.append('backend')
from mongoengine import connect
from empmanage.models import Employee, LeaveRequest, OptionalHoliday
from datetime import datetime, timedelta

# Connect to MongoDB
connect(
    db="employee_app",
    host="mongodb://localhost:27017/employee_app"
)

# Get WFH001 employee
employee = Employee.objects(emp_id='WFH001').first()
if not employee:
    print("WFH001 employee not found!")
    exit()

# Calculate working days for February 2026
year = 2026
month = 2
month_name = "February"

# Get first and last day of February 2026
start_date = datetime(year, month, 1)
if month == 12:
    end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
else:
    end_date = datetime(year, month + 1, 1) - timedelta(days=1)

# Get all leave requests for this employee in February 2026
leave_requests = LeaveRequest.objects(
    user_id=employee.emp_id,
    from_date__gte=start_date,
    from_date__lte=end_date
)

# Get optional holidays for February 2026
optional_holidays = OptionalHoliday.objects(
    date__gte=start_date,
    date__lte=end_date,
    is_active=True
)

# Calculate working days
total_working_days = 0
current_date = start_date

# February 2026 has 28 days
while current_date <= end_date:
    # Skip weekends (Saturday=5, Sunday=6)
    if current_date.weekday() >= 5:
        current_date += timedelta(days=1)
        continue

    # Check if this is a leave day
    is_leave_day = False
    for leave in leave_requests:
        if leave.from_date and leave.to_date:
            if leave.from_date <= current_date <= leave.to_date:
                is_leave_day = True
                break

    # Check if this is an optional holiday
    is_optional_holiday = False
    for holiday in optional_holidays:
        if holiday.date == current_date.date():
            is_optional_holiday = True
            break

    # Count as working day if not leave or optional holiday
    if not is_leave_day and not is_optional_holiday:
        total_working_days += 1

    current_date += timedelta(days=1)

print(f"WFH001 working days in {month_name} {year}: {total_working_days}")