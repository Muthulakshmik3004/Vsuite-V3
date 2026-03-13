# Comprehensive Payroll Management System Analysis

## Executive Summary

The Payroll Management System is a comprehensive module designed to calculate and manage employee salaries based on attendance, work hours, leaves, permissions, and overtime. The system uses a **work-hours-based calculation** method that caps daily work hours at 10 hours and limits OUT time to 7:00 PM maximum.

---

## 1. System Architecture

### 1.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Backend Framework | Django (Python) |
| Database | MongoDB |
| Frontend | React Native (Expo) |
| API Style | RESTful |
| Authentication | JWT/Django Sessions |

### 1.2 Project Structure

```
backend/
├── empmanage/
│   ├── models.py          # Database models
│   ├── views.py           # API endpoints
│   ├── urls.py            # URL routing
│   ├── services/
│   │   └── payroll_service.py    # Business logic
│   └── management/commands/
│       └── generate_payroll.py    # CLI command

frontend/
└── app/
    ├── adminPayroll.tsx   # Admin payroll interface
    ├── payroll.tsx        # Employee payroll view
    └── services/
        └── payrollService.ts     # API client
```

---

## 2. Database Models

### 2.1 PayrollSettings
**Collection:** `payroll_settings`

| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | String | Unique employee identifier |
| `employee_name` | String | Employee display name |
| `base_salary` | Float | Monthly base salary (default: 3000) |
| `effective_from` | String | Format: "YYYY-MM" |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Constraints:**
- Unique index on `employee_id`

### 2.2 MonthlyPayroll
**Collection:** `monthly_payroll`

| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | String | Employee identifier |
| `employee_name` | String | Employee name |
| `month` | String | Format: "YYYY-MM" |
| `base_salary` | Float | Monthly base salary |
| `per_hour_salary` | Float | Hourly rate (per_day_salary / 10) |
| `total_work_hours` | Float | Total hours worked in month |
| `total_salary_from_hours` | Float | Salary calculated from actual hours |
| `daily_salaries` | List[Dict] | Day-by-day breakdown |
| `calculation_method` | String | "work_hours_based" or "day_based" |
| `office_start_time` | String | "9:00 AM" |
| `office_end_time` | String | "7:00 PM" |
| `max_payable_hours` | Float | 10 hours per day |
| `total_working_days` | Int | 26 days |
| `present_days` | Int | Days with both IN/OUT punches |
| `paid_off_days` | Int | Paid time off used |
| `leave_days` | Int | Leave days taken |
| `optional_holiday_days` | Int | Approved optional holidays |
| `fixed_holiday_days` | Int | Company holidays |
| `absent_days` | Int | Uncovered absent days |
| `late_days` | Int | Days arrived after 9:00 AM |
| `late_deduction_days` | Float | Late penalty (now 0) |
| `permission_hours` | Float | Total permission minutes |
| `permission_deduction_days` | Float | Permission penalty days |
| `short_hours_days` | Int | Days with <10 hours work |
| `short_hours_deduction` | Float | Fractional deduction |
| `total_deduction_days` | Float | Total deduction days |
| `per_day_salary` | Float | Daily salary |
| `total_deduction_amount` | Float | Total deduction amount |
| `net_salary` | Float | Final calculated salary |
| `fixed_holidays` | List[Dict] | Holiday details |
| `optional_holidays` | List[Dict] | Optional holiday details |
| `sick_leave_days` | Int | Sick leave taken |
| `general_leave_days` | Int | General leave taken |
| `status` | String | "Generated" or "Draft" |
| `paid_at` | DateTime | When salary was paid |

**Constraints:**
- Unique compound index on `[employee_id, month]`

### 2.3 PaidOffLedger
**Collection:** `paid_off_ledger`

| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | String | Employee identifier |
| `month` | Int | Month (1-12) |
| `year` | Int | Year |
| `earned` | Int | Days earned (1 per month) |
| `used` | Int | Days used |
| `expired` | Int | Days expired after 3 months |

**Rules:**
- Employees earn 1 Paid Off per month
- Maximum balance: 3 days
- Validity: 3 months (rolling window)
- FIFO consumption when using

---

## 3. Payroll Calculation Rules

### 3.1 Office Time Configuration

| Parameter | Value |
|-----------|-------|
| Office Start Time | 9:00 AM |
| Office End Time | 7:00 PM (19:00) |
| Maximum Payable Hours/Day | 10 hours |
| Working Days/Month | 26 days |

### 3.2 Salary Calculation Formula

```
Per Day Salary = Base Salary / 26
Per Hour Salary = Per Day Salary / 10
Daily Salary = Paid Hours × Per Hour Salary
Net Salary = Base Salary - Total Deductions + OT Incentive
```

### 3.3 Work Hours Calculation Rules

1. **IN/OUT Punch Processing:**
   - Uses actual punch IN time
   - Caps OUT time at 7:00 PM maximum
   - Calculates work hours: (Counted OUT - IN)

2. **Daily Hour Capping:**
   - If work hours > 10, cap at 10 hours
   - Late arrival automatically reduces paid hours
   - Overtime after 7:00 PM is **ignored**

3. **Example Calculations:**

| Scenario | IN Time | OUT Time | Paid Hours |
|----------|---------|----------|------------|
| Normal | 9:00 AM | 7:00 PM | 10 hours |
| Late Arrival | 9:30 AM | 7:00 PM | 9.5 hours |
| Early Leave | 9:00 AM | 5:00 PM | 8 hours |
| Overtime Ignored | 9:00 AM | 9:00 PM | 10 hours (capped) |

### 3.4 Late Coming Rules

| Condition | Result |
|-----------|--------|
| Arrive before/at 9:00 AM | No late penalty |
| Arrive after 9:00 AM | Late arrival recorded |
| Late but works ≥10 paid hours | **No** late penalty (no deduction) |
| Late and works <10 paid hours | Late counted (but handled via reduced hours) |

**Note:** With the new work-hours-based system, late penalty is now handled automatically through reduced work hours. If you arrive late, you simply get paid for fewer hours - no additional deduction.

### 3.5 Late Out (Early Leave) Rules

| Condition | Result |
|-----------|--------|
| Leave before 7:00 PM | Reduced salary based on actual hours |
| Leave at/after 7:00 PM | Full 10 hours salary |
| Work <10 hours | Fractional deduction applied |

**Example:**
- Work 8 hours → 0.8 day salary (0.2 days deducted)
- Work 9 hours → 0.9 day salary (0.1 days deducted)
- Work 10 hours → 1.0 day salary (no deduction)

### 3.6 Permission Rules

| Condition | Deduction |
|-----------|-----------|
| ≤3 hours permission/month | No deduction |
| >3 hours permission/month | 0.5 days deduction |

**Calculation:**
- Total permission hours are summed for the month
- If >3 hours, 0.5 days is deducted from salary

### 3.7 Leave Rules

| Leave Type | Covered by Paid Off? | Deduction if No Paid Off |
|------------|---------------------|------------------------|
| **Sick Leave** | ✅ YES | Per day salary |
| **General Leave** | ✅ YES | Per day salary |
| Optional Holiday | ❌ NO (Separate) | **No deduction** |
| Unpaid Leave | ❌ NO | Per day salary |

**Important:**
- **Sick Leave** and **General Leave** are both counted as leave days and can be **covered by Paid Off**
- **Optional Holiday** is NOT counted as leave - it's a separate holiday that is always paid (no deduction)

#### How Leave Types Work:

```
In LeaveRequest Model:
├── leave_type = "sick"      → Sick Leave (covered by Paid Off)
├── leave_type = "general"   → General Leave (covered by Paid Off)
└── leave_type = "optional"  → Optional Holiday (NOT leave, always paid)
```

#### In Payroll Calculation:

1. **Sick Leave** → Counted as leave → Covered by Paid Off first → If no Paid Off → Deducted
2. **General Leave** → Counted as leave → Covered by Paid Off first → If no Paid Off → Deducted
3. **Optional Holiday** → NOT counted as leave → Always paid → No deduction → Does NOT use Paid Off

**Important:** Optional holidays are NOT counted as leave days and do NOT reduce salary. They are treated as paid days off.

### 3.8 Holiday Rules

#### Fixed Holidays
- Defined by company
- Counted as paid days
- Only weekdays count (Monday-Saturday)
- Sunday holidays NOT counted (not a working day)
- Saturday holidays ARE counted

#### Optional Holidays
- Employee can choose to take or skip
- If taken: Paid day, no salary deduction
- If skipped: Regular work day applies
- Only weekdays count (exclude Sundays)

| Holiday Type | On Saturday | On Sunday | On Weekday |
|--------------|-------------|-----------|------------|
| Fixed | ✅ Counted | ❌ Not Counted | ✅ Counted |
| Optional | ✅ Counted | ❌ Not Counted | ✅ Counted |

### 3.9 Complete Deductions Summary

| Deduction Type | Condition | Amount Formula |
|---------------|-----------|----------------|
| Absent Days | Days not covered by leave/paid-off | Days × Per Day Salary |
| Unpaid Leave | Leave without paid-off balance | Days × Per Day Salary |
| Permission Penalty | >3 hours permission in month | 0.5 days |
| Short Hours | Working <10 hours/day | (10 - Hours) / 10 × Per Day Salary |
| Late Coming | Works ≥10 hours | **No deduction** (handled via hours) |
| Late Coming | Works <10 hours | Handled via reduced hours |

### 3.10 Salary Calculation Flow

```
Base Salary
    ↓
+ OT Incentive (Hardware dept only)
    ↓
- Absent Days Deduction
- Unpaid Leave Deduction
- Permission Penalty (>3 hrs)
- Short Hours Deduction
    ↓
= Net Salary
```

### 3.11 Paid Off System

#### Overview
The **Paid Off** system is a benefit that allows employees to take paid time off without salary deduction. It's a rolling balance system with expiration.

#### Key Rules

| Rule | Description |
|------|-------------|
| Earn Rate | 1 day per month |
| Maximum Balance | 3 days |
| Validity Period | 3 months (rolling) |
| Consumption | FIFO (First In, First Out) |
| Usage | Covers leaves (sick, general) |

#### Paid Off Ledger Model
**Collection:** `paid_off_ledger`

| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | String | Employee ID |
| `month` | Integer | Month (1-12) |
| `year` | Integer | Year |
| `earned` | Integer | Days earned (always 1) |
| `used` | Integer | Days used |
| `expired` | Integer | Days expired |

#### How Paid Off Works

**1. Earning Paid Off:**
```
Each month, employee automatically earns 1 Paid Off day
- January → Earns 1
- February → Earns 1
- March → Earns 1
Total earned by March = 3 days
```

**2. Validity Period (3 Months Rolling):**
```
Example for March 2026:
- Valid: December 2025, January 2026, February 2026, March 2026
- Expired: November 2025 and earlier

Each month, entries older than 3 months automatically expire
```

**3. Maximum Balance:**
```
Maximum usable Paid Off at any time = 3 days
Even if you have 5 days earned, only 3 can be used
```

**4. FIFO Consumption:**
```
When using Paid Off, oldest valid entries are used first

Example: Employee has
- January: 1 day (valid)
- February: 1 day (valid)
- March: 1 day (valid)

If employee uses 2 days in April:
- First use January's 1 day
- Second use February's 1 day
- March's 1 day remains
```

#### Paid Off Calculation in Payroll

**Step 1: Process Monthly Earn**
```python
# Each month, automatically add 1 Paid Off
PaidOffLedger.objects.create(
    employee_id=emp_id,
    year=2026,
    month=3,
    earned=1
)
```

**Step 2: Expire Old Entries**
```python
# Entries older than 3 months are marked as expired
# March 2026 cutoff: December 2025 and older expire
```

**Step 3: Get Available Balance**
```python
# Sum: earned - used - expired (capped at 3)
# Only count entries within 3-month window
```

**Step 4: Apply to Cover Days**
```python
# When calculating payroll:
# days_need_cover = 26 - present_days - holidays
# paid_off_to_apply = min(available_paid_off, days_need_cover)
# remaining_uncovered = days_need_cover - paid_off_used
# If remaining > 0 → Unpaid Leave (deducted)
```

#### Paid Off Usage Flow

```
Month Start
    │
    ▼
┌─────────────────────┐
│ 1. Earn 1 Paid Off │
│    for this month  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 2. Expire old      │
│    (>3 months)     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 3. Calculate       │
│    available      │
│    balance        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 4. Use to cover    │
│    leaves/absences │
│    (FIFO order)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 5. If insufficient │
│    → Deduct salary │
└─────────────────────┘
```

#### Paid Off Prediction Examples

| Scenario | Paid Off Balance | Result |
|----------|------------------|--------|
| Earn 1/month, use 0 for 3 months | 3 days | Full coverage |
| Earn 1/month, use 1/month | 1-3 days | Always covered |
| Earn 1/month, use 2/month | 0-1 days | 1 day deducted |
| No Paid Off earned | 0 days | All leaves deducted |
| Balance >3 days | 3 days max | Only 3 can be used |

#### Example: Complete Paid Off Cycle

```
Month | Earn | Use | Expired | Balance | Status
------|------|-----|---------|--------|-------
Jan   | 1    | 0   | 0       | 1       | Valid
Feb   | 1    | 0   | 0       | 2       | Valid
Mar   | 1    | 0   | 0       | 3       | Valid
Apr   | 1    | 1   | 0       | 3       | FIFO used Jan
May   | 1    | 1   | 0       | 3       | FIFO used Feb
Jun   | 1    | 1   | 0       | 3       | FIFO used Mar
Jul   | 1    | 1   | 1       | 2       | Jan expired
Aug   | 1    | 1   | 0       | 2       | FIFO used Apr
Sep   | 1    | 0   | 1       | 2       | Feb expired
```

---

### 3.12 OT (Overtime) System

#### OT Request Model
**Collection:** `ot_requests`

| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | String | Employee ID |
| `employee_name` | String | Employee name |
| `department` | String | Employee department |
| `ot_date` | Date | Overtime date |
| `ot_hours` | Float | Number of OT hours |
| `reason` | String | Reason for OT |
| `document_file` | String | Path to uploaded document |
| `status` | String | Pending/Approved/Rejected |
| `admin_comment` | String | Admin review comment |
| `incentive_amount` | Float | Monetary amount (Hardware dept) |
| `paid_off_days` | Float | Paid Off days (Other depts) |

#### OT Incentive Rules

| Department | Reward Type | Description |
|------------|-------------|-------------|
| **Hardware** | Monetary Incentive | Cash bonus added to salary |
| **Other Departments** | Paid Off Days | Extra Paid Off days added |

#### OT Workflow

1. **Employee submits OT request**
   - Selects date, enters hours, provides reason
   - Optionally uploads supporting document
   - Status: `Pending`

2. **Admin reviews request**
   - Approves or Rejects
   - Sets incentive amount (Hardware) or paid off days (Others)
   - Adds comment if needed

3. **Payroll calculation**
   - Approved OT requests are included
   - Hardware: `incentive_amount` added to net salary
   - Others: `paid_off_days` added to Paid Off balance

#### OT Incentive Calculation

```python
# In payroll_service.py - get_ot_incentive_for_month()
for ot in approved_ot_requests:
    if employee.department == 'Hardware':
        ot_incentive_total += ot.incentive_amount
    # For other departments, paid_off_days handled separately
```

#### OT API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ot/create/` | Submit OT request |
| GET | `/api/ot/employee/<id>/` | Get employee's OT requests |
| GET | `/api/ot/admin/requests/` | Admin views all OT requests |
| POST | `/api/ot/review/` | Admin approves/rejects |
| POST | `/api/ot/upload/` | Upload OT document |

---

## 3.14 Payroll Logic Flow & Prediction

### 3.14.1 Core Calculation Logic

The payroll system follows a **sequential logic flow** to calculate net salary:

```
┌────────────────────────────────────────────────────────────┐
│                    START CALCULATION                       │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  1. GET BASE SALARY                                        │
│     ├─ Check PayrollSettings for employee                  │
│     └─ If not found → Use DEFAULT: ₹3,000                 │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  2. CALCULATE RATES                                        │
│     ├─ Per Day = Base Salary ÷ 26                         │
│     └─ Per Hour = Per Day ÷ 10                            │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  3. PROCESS PAID OFF LEDGER                                │
│     ├─ Earn 1 Paid Off for current month                  │
│     ├─ Expire entries older than 3 months                 │
│     └─ Get available balance                               │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  4. GET ATTENDANCE DATA                                    │
│     ├─ Present Days (IN + OUT punches)                    │
│     ├─ Work Hours from punches                            │
│     ├─ Late Days                                          │
│     └─ Short Hours Days (<10 hrs)                        │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  5. GET LEAVE DATA                                         │
│     ├─ Sick Leave (approved)                              │
│     ├─ General Leave (approved)                           │
│     └─ Optional Holiday (approved)                        │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  6. GET HOLIDAYS                                           │
│     ├─ Fixed Holidays (company-wide)                      │
│     └─ Optional Holidays (employee-specific)              │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  7. GET PERMISSION HOURS                                   │
│     └─ Sum all approved permissions                        │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  8. CALCULATE WORK HOURS SALARY                           │
│     └─ Total Hours × Per Hour Rate                        │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  9. CALCULATE COVERAGE                                     │
│     ├─ Days needing cover = 26 - Present - Holidays       │
│     ├─ Apply Paid Off to cover                           │
│     └─ Remaining = Unpaid Leave                          │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  10. CALCULATE DEDUCTIONS                                 │
│      ├─ Short Hours: (10 - Hours) ÷ 10 × Per Day         │
│      ├─ Unpaid Leave: Days × Per Day                     │
│      ├─ Permission: 0.5 days if >3 hrs                   │
│      └─ Absent: Days × Per Day                           │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  11. CALCULATE OT INCENTIVE                               │
│      ├─ Hardware Dept: Monetary amount                    │
│      └─ Other Depts: Paid Off days                       │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  12. CALCULATE NET SALARY                                 │
│      └─ Base - Deductions + OT Incentive                 │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│                    SAVE & COMPLETE                         │
└────────────────────────────────────────────────────────────┘
```

### 3.14.2 Logic Prediction Rules

The system can **predict** or **calculate** salary based on these rules:

| Condition | Prediction/Calculation |
|-----------|----------------------|
| Base Salary = ₹3,000 | Per Day = ₹115.38, Per Hour = ₹11.54 |
| Work 10 hrs/day × 22 days | Full salary = ₹3,000 |
| Work 8 hrs/day × 22 days | 80% salary = ₹2,400 |
| 1 absent day | -₹115.38 from salary |
| 1 Paid Off used | No deduction |
| >3 hrs permission | -₹57.69 (0.5 days) |
| Work <10 hrs/day | Fractional deduction |
| Hardware + OT | Add incentive to salary |

### 3.14.3 Formula Summary

```
NET SALARY = BASE - SHORT_HOURS_DEDUCTION - UNPAID_LEAVE_DEDUCTION - PERMISSION_PENALTY - ABSENT_DEDUCTION + OT_INCENTIVE

Where:
- BASE = ₹3,000 (default)
- SHORT_HOURS = Σ((10 - hours_worked) / 10) × per_day_salary
- UNPAID_LEAVE = uncovered_days × per_day_salary
- PERMISSION_PENALTY = 0.5 × per_day_salary (if >3 hrs)
- ABSENT = absent_days × per_day_salary
- OT_INCENTIVE = approved_ot × amount (Hardware dept only)
```

### 3.14.4 Prediction Examples

| Scenario | Calculation | Expected Net |
|----------|-------------|--------------|
| Perfect attendance (22 days, 10 hrs each) | ₹3,000 + OT | ₹3,000+ |
| 1 absent, no Paid Off | ₹3,000 - ₹115.38 | ₹2,884.62 |
| 2 absent, no Paid Off | ₹3,000 - ₹230.76 | ₹2,769.24 |
| 1 sick, 1 Paid Off available | ₹3,000 - ₹0 | ₹3,000 |
| 1 sick, no Paid Off | ₹3,000 - ₹115.38 | ₹2,884.62 |
| 4 hrs permission | ₹3,000 - ₹57.69 | ₹2,942.31 |
| 2 hrs permission | ₹3,000 - ₹0 | ₹3,000 |

---

## 3.15 Employee Payroll Access - Before/After Admin Generate

### Question: Can employee see payroll before Admin generates it?

**Answer: NO** - Employees cannot see their payroll amount before Admin generates it.

### How It Works:

```
┌─────────────────────────────────────────────────────────┐
│            PAYROLL GENERATION FLOW                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Admin Generates Payroll                        │
│  POST /api/payroll/generate/                           │
│  - System calculates for all employees                  │
│  - Saves to MonthlyPayroll collection                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 2: Employee Can View Payroll                     │
│  GET /api/payroll/my/                                 │
│  - Retrieves from MonthlyPayroll collection           │
│  - Shows calculated salary                            │
└─────────────────────────────────────────────────────────┘
```

### Current System Behavior:

| Scenario | Employee View | Result |
|----------|--------------|--------|
| Before Admin generates | GET /api/payroll/my/ | ❌ 404 Error "Payroll not found" |
| After Admin generates | GET /api/payroll/my/ | ✅ Shows payroll data |

### API Response:

**Before Admin Generate:**
```json
{
  "error": "Payroll not found",
  "status": 404
}
```

**After Admin Generate:**
```json
{
  "employee_id": "EMP001",
  "employee_name": "John Doe",
  "month": "2026-03",
  "base_salary": 3000,
  "net_salary": 2903.47,
  "status": "Generated"
}
```

### Summary:
- **Employees must wait** for Admin to generate payroll first
- The system **stores calculated payroll** in `MonthlyPayroll` collection
- Employee API **retrieves from saved data**, not real-time calculation
- Before generation: Employee gets **404 error**

---

## 4. API Endpoints

### 4.1 Backend API Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/payroll/generate/` | Generate payroll for month | Admin |
| GET | `/api/payroll/month/` | Get all employees' payroll | Admin |
| GET | `/api/payroll/employee/<id>/<month>/` | Get specific employee payroll | Admin |
| GET | `/api/payroll/detailed/<id>/<month>/` | Day-by-day breakdown | Admin |
| GET | `/api/payroll/my/` | Employee's own payroll | Employee |
| PUT | `/api/payroll/base-salary/<id>/` | Update base salary | Admin |
| GET | `/api/payroll/export/pdf/` | Export payroll PDF | Both |

### 4.2 Request/Response Formats

**POST /api/payroll/generate/**
```json
Request:
{
  "month": "2026-03"
}

Response:
{
  "month": "2026-03",
  "total_employees": 50,
  "successful": 48,
  "failed": 2,
  "errors": [...]
}
```

**GET /api/payroll/month/**
```json
Request:
{
  "month": "2026-03"
}

Response:
{
  "month": "2026-03",
  "employees": [...],
  "total": 50
}
```

---

## 5. Frontend Components

### 5.1 AdminPayroll.tsx
**Location:** `frontend/app/adminPayroll.tsx`

**Features:**
- Month selector with navigation
- Generate payroll button for all employees
- Employee payroll list with expandable details
- Base salary update modal
- Daily breakdown view
- OT requests management tab
- Pull-to-refresh functionality

**Key Functions:**
- `fetchPayroll()` - Load payroll data for month
- `handleGeneratePayroll()` - Trigger payroll generation
- `handleEmployeePress()` - Show employee details modal
- `handleUpdateSalary()` - Update base salary

### 5.2 payroll.tsx
**Location:** `frontend/app/payroll.tsx`

**Features:**
- Month selector
- View salary slip
- Daily breakdown toggle
- Download PDF option
- OT request navigation

**Key Functions:**
- `fetchPayroll()` - Load employee's payroll
- `handleDownloadPDF()` - Export as PDF
- `calculateDeduction()` - Calculate hour-based deduction

### 5.3 payrollService.ts
**Location:** `frontend/app/services/payrollService.ts`

**Interface - PayrollData:**
```typescript
interface PayrollData {
  employee_id: string;
  employee_name: string;
  month: string;
  base_salary: number;
  total_working_days: number;
  present_days: number;
  paid_off_days: number;
  leave_days: number;
  optional_holiday_days?: number;
  fixed_holiday_days?: number;
  absent_days: number;
  late_days: number;
  late_deduction_days: number;
  permission_hours: number;
  permission_deduction_days: number;
  short_hours_days: number;
  short_hours_deduction: number;
  total_deduction_days: number;
  per_day_salary: number;
  per_hour_salary?: number;
  total_deduction_amount: number;
  net_salary: number;
  status: string;
  
  // Work Hours Based Calculation
  total_work_hours?: number;
  total_salary_from_hours?: number;
  daily_salaries?: DailySalary[];
  calculation_method?: string;
  office_start_time?: string;
  office_end_time?: string;
  max_payable_hours?: number;
}
```

---

## 6. Key Service Functions

### 6.1 Payroll Generation

**`generate_payroll_for_month(month)`**
- Iterates through all active employees
- Calls `calculate_monthly_payroll()` for each
- Saves results to `MonthlyPayroll` collection
- Returns summary with success/failure counts

### 6.2 Calculation Functions

| Function | Description |
|----------|-------------|
| `calculate_work_hours_from_punches()` | Calculate hours with 7 PM cap |
| `calculate_daily_salary_from_punches()` | Daily salary from punches |
| `calculate_monthly_salary_from_hours()` | Aggregate daily salaries |
| `calculate_complete_monthly_payroll()` | Full payroll with all deductions |
| `get_ot_incentive_for_month()` | Calculate OT incentives |

### 6.3 Attendance Functions

| Function | Description |
|----------|-------------|
| `get_present_days()` | Count days with IN/OUT punches |
| `get_late_days()` | Count late arrivals |
| `get_leave_days()` | Count approved leaves |
| `get_permission_hours()` | Sum permission minutes |
| `get_short_hours_days()` | Count days with <10 hours |

### 6.4 Paid Off Functions

| Function | Description |
|----------|-------------|
| `earn_monthly_paid_off()` | Add 1 paid off for month |
| `expire_old_paid_off()` | Remove expired (>3 months) |
| `get_available_paid_off()` | Get current balance |
| `apply_paid_off()` | Use paid off (FIFO) |
| `process_paid_off_for_month()` | Complete paid off processing |

---

## 7. Management Commands

### 7.1 generate_payroll
**Usage:** `python manage.py generate_payroll --month=2026-01`

**Features:**
- Default to previous month if no month specified
- Validates month format (YYYY-MM)
- Processes all active employees
- Reports success/failure counts

---

## 8. Integration Points

### 8.1 Dependencies

| Model/Service | Usage in Payroll |
|--------------|------------------|
| Employee | Get employee details, base salary |
| Punch | Calculate work hours, present days |
| LeaveRequest | Get approved leaves |
| PermissionRequest | Get permission hours |
| OTRequest | Calculate OT incentives |
| FixedHoliday | Get company holidays |
| OptionalHoliday | Get optional holidays |

### 8.2 Data Flow

```
1. Admin selects month → Generate Payroll
           ↓
2. System fetches all active employees
           ↓
3. For each employee:
   a. Get base salary from PayrollSettings
   b. Calculate work hours from Punches
   c. Get leaves, permissions, holidays
   d. Process Paid Off ledger
   e. Calculate OT incentives
   f. Apply deductions
   g. Calculate net salary
   h. Save to MonthlyPayroll
           ↓
4. Admin views/employees access payroll data
```

---

## 9. Features Summary

### 9.1 Admin Features
- [x] Generate payroll for all employees
- [x] View individual employee payroll
- [x] View day-by-day breakdown
- [x] Update base salary
- [x] Export payroll as PDF
- [x] Manage OT requests
- [x] View all employees' payroll summary

### 9.2 Employee Features
- [x] View own payroll
- [x] View salary slip
- [x] View daily breakdown
- [x] Download PDF payslip
- [x] Submit OT requests

### 9.3 Calculation Features
- [x] Work-hours-based salary calculation
- [x] Automatic 7:00 PM cap on OUT time
- [x] Maximum 10 hours/day cap
- [x] Paid Off tracking with 3-month validity
- [x] Permission deduction (>3 hours = 0.5 days)
- [x] Short hours deduction
- [x] OT incentive for Hardware department
- [x] Holiday handling (fixed + optional)

---

### How Paid Off Covers Leave

The payroll system processes leave coverage in this order:

1. **First:** Present days + Fixed Holidays + Optional Holidays = Covered
2. **Second:** Paid Off is used to cover remaining days (sick leave, general leave)
3. **Third:** Any remaining uncovered days = Unpaid Leave (deducted)

**Example Calculation:**
```
Total Working Days = 26
Present Days = 22
Fixed Holidays = 2
Optional Holidays = 1
Sick Leave = 1

Days needing cover = 26 - 22 - 2 - 1 = 1 day
Paid Off Available = 2 days

Paid Off Used = 1 day (covers sick leave)
Remaining Paid Off = 1 day (carries forward)
Leave Deduction = 0 days (fully covered)
```

---

## 10. System Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `WORKING_DAYS_PER_MONTH` | 26 | Standard working days |
| `PAID_OFF_VALIDITY_MONTHS` | 3 | Paid off validity period |
| `PAID_OFF_MAX_BALANCE` | 3 | Maximum paid off days |
| `OFFICE_START_HOUR` | 9 | Office open time |
| `OFFICE_END_HOUR` | 19 | 7:00 PM |
| `MAX_PAYABLE_HOURS_PER_DAY` | 10 | Maximum paid hours |
| `GRACE_HOUR` | 9 | Late threshold |
| `FREE_PERMISSION_HOURS` | 180 | 3 hours free |
| `PERMISSION_PENALTY_DAYS` | 0.5 | Penalty for >3 hours |

---

## 11. Complete Payroll Calculation Example

### Employee Profile
- **Employee ID:** EMP001
- **Name:** John Doe
- **Department:** Hardware
- **Base Salary:** ₹3,000 (Default)
- **Month:** March 2026
- **Paid Off Available:** 2 days

### Step 1: Calculate Basic Salary Rates
```
Per Day Salary = Base Salary / 26
                = ₹3,000 / 26
                = ₹115.38

Per Hour Salary = Per Day Salary / 10
                = ₹115.38 / 10
                = ₹11.54
```

### Step 2: Attendance Data for March 2026
| Day Type | Count | Description |
|----------|-------|-------------|
| Present (with punch) | 22 days | Days with both IN/OUT |
| Fixed Holidays | 2 days | Company holidays |
| Optional Holidays | 1 day | Approved optional holiday |
| Sick Leave | 1 day | Approved sick leave |
| Paid Off Available | 2 days | Used to cover leave |
| Absent | 0 days | No unapproved absences |

### Step 3: Work Hours Analysis
| Metric | Value |
|--------|-------|
| Total Work Hours | 215 hours |
| Short Hours Days | 3 days (worked <10 hrs) |
| Late Arrivals | 2 days (but worked ≥10 hrs, no penalty) |

### Step 4: Calculate Work Hours Salary
```
Work Hours Salary = Total Work Hours × Per Hour Salary
                  = 215 × ₹11.54
                  = ₹2,481.10
```

### Step 5: Calculate Deductions

#### 5.1 Short Hours Deduction
```
Day 1: 8 hours → (10-8)/10 = 0.2 days
Day 2: 9 hours → (10-9)/10 = 0.1 days  
Day 3: 7.5 hours → (10-7.5)/10 = 0.25 days

Total Short Hours Deduction = 0.2 + 0.1 + 0.25 = 0.55 days
Amount = 0.55 × ₹115.38 = ₹63.46
```

#### 5.2 Leave Deduction (Unpaid)
```
Sick Leave = 1 day
Paid Off Available = 2 days (used to cover sick leave)
Leave Deduction = 0 days (covered by Paid Off)
```

**Note:** Sick leave is FIRST covered by Paid Off. Only if Paid Off is exhausted, the leave would be deducted.

#### 5.3 Permission Deduction
```
Total Permission Hours = 4 hours (in month)
Since 4 > 3 hours → Penalty = 0.5 days
Amount = 0.5 × ₹115.38 = ₹57.69
```

#### 5.4 Total Deductions
```
Short Hours Deduction = ₹63.46
Leave Deduction = ₹0.00 (covered by Paid Off)
Permission Penalty = ₹57.69

Total Deductions = ₹121.15
```

### Step 6: Calculate OT Incentive (Hardware Department)
```
Approved OT Requests:
- March 5: 3 hours → ₹50
- March 12: 2 hours → ₹30
- March 20: 4 hours → ₹60

Total OT Incentive = ₹140
```

### Step 7: Calculate Net Salary
```
Net Salary = Base Salary - Total Deductions + OT Incentive
           = ₹3,000 - ₹121.15 + ₹140
           = ₹3,018.85
```

### Summary Table

| Component | Amount (₹) |
|-----------|------------|
| **Base Salary** | 3,000.00 |
| **Additions** | |
| OT Incentive | +140.00 |
| **Deductions** | |
| Short Hours | -63.46 |
| Sick Leave (Paid Off) | 0.00 |
| Permission Penalty | -57.69 |
| **Net Salary** | **3,018.85** |

### Detailed Breakdown

| Description | Days/Hours | Amount |
|-------------|-----------|--------|
| Present Days | 22 | ₹2,538.46 |
| Fixed Holidays | 2 | ₹230.76 |
| Optional Holiday | 1 | ₹115.38 |
| Sick Leave (Covered by Paid Off) | 1 | ₹0.00 |
| Short Hours Deduction | 0.55 | -₹63.46 |
| Permission Penalty | 0.5 | -₹57.69 |
| OT Incentive | - | +₹140.00 |
| **Total** | - | **₹3,018.85** |

---

## 12. Payroll Calculation Flowchart

```
┌─────────────────────────────────────────┐
│         START PAYROLL CALCULATION       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  1. GET EMPLOYEE BASE SALARY            │
│     - From PayrollSettings              │
│     - Default: ₹3,000                   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  2. CALCULATE PER DAY / PER HOUR        │
│     - Per Day = Base / 26               │
│     - Per Hour = Per Day / 10           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  3. GET ATTENDANCE DATA                 │
│     - Present days (IN+OUT punches)     │
│     - Work hours from punches           │
│     - Late days                        │
│     - Short hours days                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  4. GET LEAVE DATA                      │
│     - Sick leave (approved)             │
│     - General leave (approved)          │
│     - Optional holiday (approved)       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  5. GET PERMISSION HOURS                │
│     - Sum all approved permissions      │
│     - If >3 hours → 0.5 days penalty   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  6. GET HOLIDAYS                        │
│     - Fixed holidays (company)          │
│     - Optional holidays (employee)      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  7. PROCESS PAID OFF LEDGER             │
│     - Earn 1 day/month                  │
│     - Use available balance             │
│     - Expire old (>3 months)            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  8. GET OT INCENTIVES                   │
│     - Hardware: monetary amount         │
│     - Others: Paid Off days             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  9. CALCULATE DEDUCTIONS                │
│     - Short hours: (10-hrs)/10 ×/day   │
│     - Leave: days × per_day             │
│     - Permission: 0.5 if >3hrs          │
│     - Absent: days × per_day            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  10. CALCULATE NET SALARY               │
│      Base - Deductions + OT Incentive   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  11. SAVE TO MONTHLY PAYROLL            │
│      - Store all calculation details    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         END PAYROLL CALCULATION          │
└─────────────────────────────────────────┘
```

---

## 11. Conclusion

The Payroll Management System is a well-designed, comprehensive solution that:

1. **Accurately calculates salaries** based on actual work hours with proper capping
2. **Handles multiple deduction types** including absences, leaves, permissions, and short hours
3. **Tracks Paid Off days** with rolling 3-month validity and FIFO consumption
4. **Supports OT incentives** for Hardware department employees
5. **Provides full visibility** through admin and employee interfaces
6. **Integrates seamlessly** with attendance, leave, and permission systems

The system follows best practices with clear separation of concerns (models, views, services) and provides both API and CLI interfaces for payroll management.
