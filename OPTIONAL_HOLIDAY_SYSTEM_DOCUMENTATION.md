# Optional Holiday Management System Documentation

## Overview

The Optional Holiday Management System allows employees to take special holidays that are predefined by the organization. These are distinct from regular leaves because they do not affect the employee's salary and are limited to 2 per year per employee.

---

## System Architecture

### Backend Components

#### 1. Data Model ([`models.py`](backend/empmanage/models.py:269))

**OptionalHoliday**
- Stores optional holidays defined by the Admin
- Fields:
  - `name`: Holiday name (e.g., "Diwali", "Holi")
  - `date`: Date of the holiday
  - `year`: Year of the holiday
  - `is_active`: Whether the holiday is active
  - `created_by`: Who created it (default: "admin")
  - `created_at`: Creation timestamp

#### 2. Validation Functions ([`models.py`](backend/empmanage/models.py:292))

**`validate_optional_leave(employee, start_date)`**
- Validates optional leave requests before approval
- Checks:
  1. Date must exist in OptionalHoliday collection (must be an active optional holiday)
  2. Employee has used fewer than 2 optional leaves in the current year
  3. No duplicate optional leave request for the same date

**`get_optional_leave_count(employee_id)`**
- Returns count of optional leaves used in current year
- Returns: `{"used": int, "remaining": int}`

### Constants

```python
OPTIONAL_HOLIDAY_MAX_PER_YEAR = 2
```

---

## Key Features

### 1. Admin Features
- Add new optional holidays with name and date
- Delete optional holidays
- View all configured optional holidays
- Approve/reject optional leave requests from employees

### 2. Employee Features
- View list of available optional holidays
- Check remaining optional holidays available
- Submit optional leave request (requires admin approval)
- Track optional leave usage

---

## Leave Types Comparison

| Feature | Sick Leave | General Leave | Optional Holiday |
|---------|-----------|---------------|-------------------|
| Requires Reason | Yes | Yes | No |
| Max Days/Year | Varies | Varies | 2 |
| Salary Deduction | Yes | Yes | **No** |
| Needs Approval | Yes | Yes | Yes |
| Admin Defined | No | No | Yes |

---

## How It Works

### Step 1: Admin Configures Holidays
1. Admin navigates to "Manage Optional Holidays" in admin dashboard
2. Admin adds optional holidays with name and date for the year
3. Holidays are stored in the `optional_holidays` collection

### Step 2: Employee Applies for Optional Leave
1. Employee selects "Optional Holiday" as leave type
2. System fetches available optional holidays from database
3. Employee selects a specific holiday from the list
4. System validates:
   - Employee has remaining optional holidays (less than 2 used)
   - Selected date is a valid optional holiday
   - No duplicate request for same date
5. Employee submits request (requires admin approval)

### Step 3: Admin Approval
1. Admin sees optional leave request in requests list
2. Admin approves or rejects the request
3. If approved, it counts towards employee's annual limit

### Step 4: Payroll Impact
- Optional holidays are **NOT deducted** from salary
- Optional holiday days are **NOT counted** as leave days in payroll
- They appear differently in the UI to distinguish from regular leaves

---

## Frontend Components

### Admin View ([`ManageOptionalHolidays.tsx`](frontend/app/ManageOptionalHolidays.tsx:1))
- Add new optional holidays
- Delete existing optional holidays
- View all optional holidays for the year

### Employee Leave Request ([`leave.tsx`](frontend/app/leave.tsx:1))
- Select "Optional Holiday" as leave type
- View list of available optional holidays
- Check remaining optional holidays count
- Submit optional leave request

### Admin Request Review ([`AdminRequest.tsx`](frontend/app/AdminRequest.tsx:1))
- View all leave requests including optional holidays
- Approve/reject optional leave requests
- See warning about counting towards annual limit

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/optional-holidays/` | GET | Get all active optional holidays |
| `/api/admin/optional-holidays/` | POST | Add new optional holiday (Admin) |
| `/api/admin/optional-holidays/<id>/delete/` | DELETE | Delete optional holiday (Admin) |
| `/api/leaves/create/` | POST | Submit leave request (including optional) |
| `/api/leaves/count/<user_id>/` | GET | Get leave counts including optional holidays |

---

## Validation Rules

### Adding Optional Holiday (Admin)
- Holiday name is required
- Date is required
- Date must not duplicate existing holiday

### Submitting Optional Leave (Employee)
1. Must select a specific optional holiday from the list
2. Must have remaining optional holidays (less than 2 used this year)
3. Cannot submit duplicate request for same date

### Approving Optional Leave (Admin)
1. Date must exist in OptionalHoliday collection
2. Employee must have fewer than 2 approved optional leaves this year
3. No duplicate approved request for same date

---

## Database Collection

| Collection | Description |
|------------|-------------|
| `optional_holidays` | Stores optional holiday definitions |
| `leave_requests` | Stores all leave requests (including optional) |

---

## Important Notes

1. **Limit**: Maximum 2 optional holidays per employee per year
2. **No Salary Deduction**: Optional holidays do not reduce salary
3. **Admin Approval Required**: All optional leave requests require admin approval
4. **Date Specific**: Employee must select from predefined optional holiday dates
5. **No Reason Required**: Unlike other leave types, optional holiday doesn't require a reason

---

## Integration with Payroll

Optional holidays are handled specially in the payroll system ([`payroll_service.py`](backend/empmanage/services/payroll_service.py:186)):

```python
# Only count: sick and general leave types
# EXCLUDE: optional leave type (leave_type="optional")
leaves = LeaveRequest.objects(
    ...
    leave_type__in=['sick', 'general']  # Exclude optional leaves
)
```

This ensures:
- Optional holidays do NOT count as leave days
- Optional holidays do NOT reduce salary
- Optional holidays do NOT affect paid off rule
- Optional holidays do NOT affect sick/general leave deduction

---

## User Flow Diagram

```
ADMIN                           EMPLOYEE                        SYSTEM
  |                                |                               |
  |--- Add Optional Holiday ----->|                               |
  |                                |                               |
  |                                |<-- View Available Holidays --|
  |                                |                               |
  |                                |-- Submit Optional Leave ---->|
  |                                |                               |
  |<-- View Leave Request ---------|                               |
  |                                |                               |
  |-- Approve Request ----------->|                               |
  |                                |                               |
  |                                |<-- Payroll (No Deduction) ---|
  |                                |                               |
```
