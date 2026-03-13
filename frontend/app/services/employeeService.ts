import axios from 'axios';
import API_BASE_URL from '../../config';

export interface Employee {
  id: string;
  emp_id: string;
  name: string;
  gmail: string;
  role: string;
  department: string;
  employment_type?: string;
  is_verified?: boolean;
  is_removed?: boolean;
  home_verified?: boolean;
}

export interface EmployeeResponse {
  success: boolean;
  message?: string;
  employees?: Employee[];
  error?: string;
}

const employeeService = {
  // Get all employees (Admin only)
  getAllEmployees: async (): Promise<EmployeeResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/employees`);
      console.log('[EmployeeService] API Response:', response.data);
      
      if (response.data && response.data.employees) {
        return {
          success: true,
          employees: response.data.employees,
        };
      } else if (response.data && Array.isArray(response.data)) {
        // Some APIs return array directly
        return {
          success: true,
          employees: response.data,
        };
      }
      
      return {
        success: false,
        error: 'No employee data found',
      };
    } catch (error: any) {
      console.error('[EmployeeService] Error fetching employees:', error);
      console.error('[EmployeeService] Error response:', error.response?.data);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch employees',
      };
    }
  },

  // Get single employee by ID
  getEmployeeById: async (empId: string): Promise<{success: boolean; employee?: Employee; error?: string}> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/employees/${empId}`);
      console.log('[EmployeeService] Get Employee Response:', response.data);
      
      return {
        success: true,
        employee: response.data,
      };
    } catch (error: any) {
      console.error('[EmployeeService] Error fetching employee:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch employee',
      };
    }
  },
};

export default employeeService;
