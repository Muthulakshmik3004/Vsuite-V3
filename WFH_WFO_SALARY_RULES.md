# WFH (Work From Home) and WFO (Work From Office) - Conditions and Salary Rules

## 1. Temporary WFO to WFH Request System

### Overview
The system allows **WFO employees** to temporarily switch to **WFH (Work From Home)** mode by submitting a request. This is different from employees who are permanently designated as WFH.

### WFH Request Model
Location: [`backend/empmanage/models.py:537`](backend/empmanage/models.py:537)

```python
class WFHRequest(me.Document):
    employee_id = me.StringField(required=True)
    employee_name = me.StringField(required=True)
    department = me.StringField(required=True)
    from_date = me.DateTimeField(required=True)  # Start date of WFH
    to_date = me.DateTimeField(required=True)    # End date of WFH
    reason = me.StringField(required=True)       # Reason for WFH request
    status = me.StringField(default="Pending", choices=["Pending", "Approved", "Rejected"])
    approved_by = me.StringField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
```

### Conditions for WFH Request

#### Eligibility
- Only **WFO employees** can request temporary WFH
- Verified in [`views.py:4520`](backend/empmanage/views.py:4520):
```python
if employee.employment_type != "WFO":
    return Response({"error": f"Only WFO employees can request WFH. Current type: {employee.employment_type}"}, status=400)
```

#### Request Process
1. Employee submits WFH request with:
   - `from_date` - Start date
   - `to_date` - End date
   - `reason` - Justification for WFH

2. Admin reviews and approves/rejects the request

3. **On Approval** ([`views.py:4600-4610`](backend/empmanage/views.py:4600)):
   - Employee's `employment_type` is automatically changed to "WFH"
   - This change is **temporary** for the requested period

#### Automatic Reversion
The system has a management command [`revert_expired_wfh`](backend/empmanage/management/commands/revert_expired_wfh.py) that:
- Runs automatically
- Checks for approved WFH requests that have ended
- Reverts employees back to their original employment type (WFO)
- Only reverts if there are no other active WFH requests

---

## 2. Salary Rules Comparison

### Key Difference: Temporary WFH vs Permanent WFH

**Important:** WFO employees with approved temporary WFH requests **still get WFO salary rules** - they just punch in/out from home instead of office. The WFH salary rules only apply to **permanent WFH employees**.

Verified in [`payroll_service.py:42-67`](backend/empmanage/services/payroll_service.py:42):
```python
def should_apply_wfh_rules(employee_id: str, check_date: date = None) -> bool:
    """
    Check if WFH salary rules should be applied.
    
    Returns True (apply WFH rules) ONLY if:
    - Employee has employment_type = 'WFH' (permanent WFH)
    
    Returns False (apply WFO rules) if:
    - Employee has employment_type = 'WFO' but has approved WFH request
    - Employee has employment_type = 'WFO' with no WFH request
    
    WFO employees with approved WFH request still get WFO salary rules (10 hrs, holidays, OT, paid leave)
    They just punch in/out from home instead of office.
    """
```

### Salary Rules Summary Table

| Feature | WFO Employee | Permanent WFH Employee |
|---------|--------------|------------------------|
| **Max Payable Hours/Day** | 10 hours | 3 hours |
| **Default Base Salary** | 3000 | 1500 |
| **Holiday Pay** | ✅ Fully paid (no punch required) | ❌ Must punch to get paid |
| **Optional Holiday Pay** | ✅ Fully paid | ❌ Must punch to get paid |
| **Paid Off (Paid Leave)** | ✅ Available | ❌ Not available |
| **Permission Deductions** | ✅ Apply (>3 hours = 0.5 day) | ❌ Not applicable |
| **Short Hours Deduction** | ✅ Apply (<10 hours) | ❌ Not applicable |
| **Late Penalty** | ✅ Apply | ❌ Not applicable |
| **OT Incentives** | ✅ Available (Hardware dept) | ❌ Not available |

### Detailed Salary Calculation

#### WFO Employees (includes temporary WFH)
- **Base Salary**: 3000 (default)
- **Working Days**: 26 days/month
- **Max Hours/Day**: 10 hours
- **Salary Formula**: `Net Salary = Base Salary - Deductions + OT Incentive`
- **Deductions include**:
  - Absent days
  - Unpaid leave days
  - Short hours days (< 10 hours)
  - Permission penalty (> 3 hours = 0.5 day)

#### Permanent WFH Employees
- **Base Salary**: 1500 (default)
- **Max Hours/Day**: 3 hours
- **Salary Formula**: `Net Salary = Actual Hours Worked × Hourly Rate`
- **Hourly Rate**: `Base Salary / (26 days × 3 hours)`
- **No deductions** for:
  - Short hours
  - Permissions
  - Late arrivals
- **Must punch** to get paid for any day (including holidays)

### Punch Validation Rules

From [`views.py:491-507`](backend/empmanage/views.py:491):

| Work Mode | Minimum Hours | Error Message |
|-----------|--------------|----------------|
| **WFH** | 3 hours | "WFH employees must work minimum 3 hours. Current: Xh" |
| **WFO** | 10 hours | "WFO employees must work minimum 10 hours. Current: Xh" |

---

## 3. Summary

### For Temporary WFH (WFO employee with approved request):
- ✅ Can work from home during the approved period
- ✅ Gets WFO salary rules (10 hrs/day, holidays, paid leave, OT)
- ✅ Must still meet minimum 10 hours work requirement
- ✅ Automatically reverts to WFO after the period ends

### For Permanent WFH Employee:
- ⚠️ Limited to 3 hours max payable per day
- ⚠️ Lower base salary (1500 vs 3000)
- ⚠️ No holiday pay, no paid leave, no OT
- ⚠️ Must punch every day to get paid
- ✅ Flexible hours (no late/permission penalties)

---

## Related Files

- **Models**: [`backend/empmanage/models.py`](backend/empmanage/models.py) - WFHRequest, Employee
- **Views**: [`backend/empmanage/views.py`](backend/empmanage/views.py) - create_wfh_request, update_wfh_request_status
- **Payroll Service**: [`backend/empmanage/services/payroll_service.py`](backend/empmanage/services/payroll_service.py) - should_apply_wfh_rules, calculate_monthly_payroll
- **Management Commands**: 
  - [`backend/empmanage/management/commands/create_wfh_employee.py`](backend/empmanage/management/commands/create_wfh_employee.py)
  - [`backend/empmanage/management/commands/revert_expired_wfh.py`](backend/empmanage/management/commands/revert_expired_wfh.py)
