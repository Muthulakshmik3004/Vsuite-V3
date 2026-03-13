import axios from 'axios';
import API_BASE_URL from '../../config';

export interface PayrollData {
  employee_id: string;
  employee_name: string;
  month: string;
  base_salary: number;
  total_working_days: number;
  present_days: number;
  paid_off_days: number;
  leave_days: number;
  optional_holiday_days?: number;  // Approved optional holiday days
  fixed_holiday_days?: number;     // Fixed company holiday days
  absent_days: number;
  late_days: number;
  late_deduction_days: number;
  permission_hours: number;
  permission_deduction_days: number;
  short_hours_days: number;       // Days with less than 10 hours work
  short_hours_deduction: number;  // Deduction for short hours
  total_deduction_days: number;
  per_day_salary: number;
  per_hour_salary?: number;       // NEW: Per hour salary
  total_deduction_amount: number;
  net_salary: number;
  status: string;
  generated_at?: string;
  fixed_holidays?: Array<{name: string, date: string, year: number}>;  // Fixed holiday details
  
  // NEW: Work Hours Based Calculation Fields
  total_work_hours?: number;           // Total hours worked in the month
  total_salary_from_hours?: number;    // Total salary calculated from hours
  daily_salaries?: Array<{            // Daily breakdown
    date: string;
    work_mode?: string;                  // "WFO" or "WFH"
    in_time: string;
    in_time_display?: string;         // Display format like "09:00 AM"
    out_time: string;
    out_time_display?: string;         // Display format like "07:00 PM"
    counted_out_time: string;
    counted_out_display?: string;      // Display format like "07:00 PM"
    work_hours: number;
    daily_salary: number;
    permissions?: Array<{              // Permission details
      time: string;
      reason: string;
      duration_minutes: number;
    }>;
    permission_minutes?: number;       // Total permission minutes for the day
  }>;
  calculation_method?: string;         // "work_hours_based"
  office_start_time?: string;         // "9:00 AM"
  office_end_time?: string;           // "7:00 PM"
  max_payable_hours?: number;        // 10
  employment_type?: string;           // "WFO" or "WFH"
}

export interface PayrollResponse {
  success: boolean;
  message?: string;
  data?: PayrollData;
  employees?: PayrollData[];
  total?: number;
}

const payrollService = {
  // Generate payroll for all employees (Admin only)
  generatePayroll: async (month: string): Promise<PayrollResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/payroll/generate/`, {
        month,
      });
      return {
        success: true,
        message: 'Payroll generated successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to generate payroll',
      };
    }
  },

  // Get payroll for all employees for a month (Admin)
  getMonthPayroll: async (month: string): Promise<PayrollResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/payroll/month/`, {
        params: { month },
      });
      return {
        success: true,
        message: 'Payroll retrieved successfully',
        employees: response.data.employees,
        total: response.data.total,
      };
    } catch (error: any) {
      console.error('Error retrieving payroll:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to retrieve payroll',
      };
    }
  },

  // Get specific employee payroll (Admin)
  getEmployeePayroll: async (employeeId: string, month: string): Promise<PayrollResponse> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/payroll/employee/${employeeId}/${month}/`
      );
      return {
        success: true,
        message: 'Payroll retrieved successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error retrieving employee payroll:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to retrieve employee payroll',
      };
    }
  },

  // Get own payroll (Employee)
  getMyPayroll: async (employeeId: string, month: string): Promise<PayrollResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/payroll/my/`, {
        params: { employee_id: employeeId, month },
      });
      return {
        success: true,
        message: 'Payroll retrieved successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error retrieving my payroll:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to retrieve payroll',
      };
    }
  },

  // Update employee base salary (Admin)
  updateBaseSalary: async (
    employeeId: string,
    baseSalary: number,
    effectiveFrom: string
  ): Promise<PayrollResponse> => {
    try {
      console.log("[PayrollService] Updating base salary:", { employeeId, baseSalary, effectiveFrom });
      const response = await axios.put(
        `${API_BASE_URL}/api/payroll/base-salary/${employeeId}/`,
        {
          base_salary: baseSalary,
          effective_from: effectiveFrom,
        }
      );
      console.log("[PayrollService] Update response:", response.data);
      return {
        success: true,
        message: 'Base salary updated successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error updating base salary:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to update base salary',
      };
    }
  },

  // Export payroll as PDF
  exportPayrollPDF: async (employeeId: string, month: string): Promise<{ success: boolean; message: string; data?: string }> => {
    try {
      const downloadUrl = `${API_BASE_URL}/api/payroll/export/pdf/?employee_id=${employeeId}&month=${month}`;
      return {
        success: true,
        message: 'PDF export URL generated',
        data: downloadUrl,
      };
    } catch (error: any) {
      console.error('Error generating PDF export URL:', error);
      return {
        success: false,
        message: 'Failed to generate PDF export URL',
      };
    }
  },

  // Export payroll as Excel
  exportPayrollExcel: async (month: string): Promise<{ success: boolean; message: string; data?: string }> => {
    try {
      const downloadUrl = `${API_BASE_URL}/api/payroll/excel/?month=${month}`;
      return {
        success: true,
        message: 'Excel export URL generated',
        data: downloadUrl,
      };
    } catch (error: any) {
      console.error('Error generating Excel export URL:', error);
      return {
        success: false,
        message: 'Failed to generate Excel export URL',
      };
    }
  },

  // Send salary slips to all employees via email (Admin)
  sendSalarySlipsEmail: async (month: string): Promise<{ success: boolean; message: string; data?: { sent_count: number; failed_count: number; total_records: number; failed_emails: string[] } }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/payroll/send-emails/`, {
        month,
      });
      return {
        success: true,
        message: 'Salary slips sent successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error sending salary slips:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to send salary slips',
      };
    }
  },
};

export default payrollService;
