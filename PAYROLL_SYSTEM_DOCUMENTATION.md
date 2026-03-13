# Payroll System Documentation

## Overview

The payroll system calculates employee salaries based on working hours with the following rules and specifications.

---

## 1. Working Schedule

- **Official Office Time**: 9:00 AM to 7:00 PM
- **Total Payable Work Hours per Day**: 10 hours
- **Salary Calculation Window**: Only within 9:00 AM to 7:00 PM
- **Overtime Rule**: Any work after 7:00 PM must be ignored and should not increase paid hours

---

## 2. Salary Structure

- **Working Days per Month**: 26 days
- **Base Salary**: Employee-specific (default: 3000 if not defined)

### Salary Calculations

```
Per Day Salary = Base Salary / 26
Per Hour Salary = Per Day Salary / 10
Daily Salary = Work Hours × Per Hour Salary
```

### Example

For Base Salary = 3000:
- Per Day Salary = 3000 / 26 = 115.38
- Per Hour Salary = 115.38 / 10 = 11.54

---

## 3. Work Hour Calculation

### IN/OUT Time Processing

1. Get employee's IN time and OUT time from attendance punches
2. If OUT time is later than 7:00 PM, cap it at 7:00 PM

```
Counted_OUT = minimum(Actual_OUT_Time, 7:00 PM)
```

3. Calculate work hours:

```
Work_Hours = Counted_OUT - IN_Time
```

### Examples

| Scenario | IN Time | OUT Time | Counted OUT | Work Hours |
|----------|---------|----------|-------------|------------|
| Full Day | 9:00 AM | 7:00 PM | 7:00 PM | 10.0 |
| Late Arrival | 9:30 AM | 7:00 PM | 7:00 PM | 9.5 |
| Overtime Ignored | 9:30 AM | 7:30 PM | 7:00 PM | 9.5 |
| Early Leave | 9:00 AM | 5:00 PM | 5:00 PM | 8.0 |

---

## 4. Salary Calculation Rules

### Maximum Paid Hours
- Maximum paid hours per day = 10 hours
- If Work_Hours > 10, cap it at 10

### Daily Salary Formula

```
Daily Salary = Work_Hours × Per_Hour_Salary
```

---

## 5. Late Arrival Handling

- If an employee arrives late, the system automatically reduces the salary based on lost hours
- Staying late after 7:00 PM does NOT compensate for late arrival
- The maximum payable time is always 7:00 PM regardless of actual OUT time

### Example

IN: 9:30 AM
OUT: 7:30 PM

Counted OUT = 7:00 PM (capped)
Work Hours = 9:30 → 7:00 = 9.5 hours
Daily Salary = 9.5 × 11.54 = 109.62

The extra 30 minutes after 7:00 PM is ignored.

---

## 6. Deductions

### Absent Days
- Unpaid days when employee doesn't report to work
- Deducted at Per Day Salary rate

### Short Hours Deduction
- When employee works less than 10 hours in a day
- Calculated based on actual hours worked vs. expected 10 hours

### Permission Deduction
- If permission hours > 3 hours in a month, deduct 1 day salary

### Late Coming
- No direct deduction for late arrival
- Salary is automatically reduced due to fewer work hours

---

## 7. Example Scenarios

### Scenario 1: Perfect Attendance
- IN: 9:00 AM, OUT: 7:00 PM
- Work Hours: 10
- Daily Salary: 10 × 11.54 = 115.38 (Full Day)

### Scenario 2: Late Arrival (30 min)
- IN: 9:30 AM, OUT: 7:00 PM
- Work Hours: 9.5
- Daily Salary: 9.5 × 11.54 = 109.62

### Scenario 3: Overtime Not Counted
- IN: 9:30 AM, OUT: 7:30 PM
- Counted OUT: 7:00 PM (capped)
- Work Hours: 9.5
- Daily Salary: 9.5 × 11.54 = 109.62

### Scenario 4: Early Leave
- IN: 9:00 AM, OUT: 5:00 PM
- Work Hours: 8.0
- Daily Salary: 8.0 × 11.54 = 92.31

---

## 8. Implementation Details

### Constants

```python
OFFICE_START_HOUR = 9    # 9:00 AM
OFFICE_START_MINUTE = 0
OFFICE_END_HOUR = 19     # 7:00 PM (24-hour format)
OFFICE_END_MINUTE = 0
MAX_PAYABLE_HOURS = 10   # Maximum payable hours per day
WORKING_DAYS_PER_MONTH = 26
DEFAULT_BASE_SALARY = 3000
```

### Key Functions

1. `calculate_work_hours_from_punches(in_time, out_time)` - Calculate work hours with capping
2. `calculate_daily_salary_from_punches(in_time, out_time, per_hour_salary)` - Calculate daily salary
3. `calculate_monthly_payroll(employee_id, month)` - Main payroll calculation
4. `save_monthly_payroll(payroll_data)` - Save to database

### Database Model Fields

The MonthlyPayroll model includes:

- **Salary Info**: base_salary, per_day_salary, per_hour_salary
- **Work Hours**: total_work_hours, total_salary_from_hours
- **Daily Details**: daily_salaries (list of daily breakdowns)
- **Office Config**: office_start_time, office_end_time, max_payable_hours
- **Calculation Method**: calculation_method
- **Working Days**: total_working_days, present_days, absent_days, leave_days
- **Deductions**: late_days, late_deduction_days, permission_hours, permission_deduction_days, short_hours_days, short_hours_deduction
- **Net Salary**: net_salary

---

## 9. Sample Data (January & February 2026)

### Employee Summary

| Employee | Name | Base Salary | Scenario |
|----------|------|-------------|----------|
| EMP001 | Arun Kumar | 3000 | Perfect attendance (full 10 hours every day) |
| EMP002 | Divya Sharma | 3000 | Mixed - late arrivals, short days, overtime ignored |
| EMP003 | Rahul Verma | 3000 | Some absences, full hours when present |
| EMP004 | Sneha Reddy | 3000 | Mostly short hours (leaves early) |
| EMP005 | Vikram Singh | 3000 | Mostly absent |

### Sample Results

**EMP001 (January 2026)**
- Present: 26 days, Absent: 0 days
- Total Work Hours: 260.0
- Net Salary: Rs. 3000.00

**EMP002 (January 2026)**
- Present: 19 days, Absent: 7 days
- Late Days: 4, Short Hours Days: 8
- Net Salary: Rs. 2080.38

**EMP004 (January 2026)**
- Present: 15 days, Absent: 10 days
- Short Hours Days: 15 (all days worked < 10 hours)
- Net Salary: Rs. 1534.62

---

## 10. Final Rule Summary

1. Maximum paid hours per day = 10
2. Paid time window = 9:00 AM to 7:00 PM
3. Late arrival reduces paid hours automatically
4. Overtime after 7:00 PM is ignored
5. Daily salary = Paid Hours × Per Hour Salary
6. Base Salary divided by 26 for per day rate
7. Per day rate divided by 10 for per hour rate
