import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../config';

// Types
export interface JobsheetData {
  id?: string;
  company_name: string;
  company_address: string;
  job_sheet_no: string;
  date: string;
  engineer_id: string;
  engineer_name: string;
  engineer_code: string;
  engineer_signature?: string;
  customer_name: string;
  customer_phone: string;
  customer_reference: string;
  customer_location: string;
  service_type: string;
  service_date: string;
  service_time_start: string;
  service_time_end: string;
  issue_description: string;
  solution_provided: string;
  customer_comment: string;
  parts_used: any[];
  working_hours: number;
  working_minutes: number;
  transportation_km: number;
  working_engineer_signature?: string;
  bill_no?: string;
  manpower_charges?: number;
  petrol?: number;
  food_tea?: number;
  profit?: number;
  net_profit?: number;
  incentive_percentage?: number;
  status: string;
  review?: any;
  created_at?: string;
  updated_at?: string;
}

export interface JobsheetReviewData {
  reviewer_id: string;
  status: 'APPROVED' | 'REJECTED';
  comment: string;
}

export interface JobsheetReviewListItem {
  id: string;
  job_sheet_no: string;
  engineer_name: string;
  customer_name: string;
  service_date: string;
  status: string;
  date: string;
  customer_phone: string;
  customer_location: string;
  review?: {
    status: string;
    comment: string;
    reviewedBy?: {
      name: string;
      empId: string;
    };
    reviewDate?: string;
  };
}

class JobsheetService {
  private getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Create jobsheet
  async createJobsheet(data: JobsheetData): Promise<{ success: boolean; data?: JobsheetData; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/jobsheet/create/`, data, { headers });

      if (response.status === 201) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: 'Failed to create jobsheet' };
      }
    } catch (error: any) {
      console.error('Create jobsheet error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Get employee's own jobsheets
  async getEmployeeJobsheets(employeeId: string): Promise<{ success: boolean; data?: JobsheetData[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/jobsheet/employee/${employeeId}/`, { headers });

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: 'Failed to load jobsheets' };
      }
    } catch (error: any) {
      console.error('Get employee jobsheets error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Get all jobsheets (Admin/Team Lead)
  async getAllJobsheets(filters?: {
    from_date?: string;
    to_date?: string;
    employee_id?: string;
    service_type?: string;
  }): Promise<{ success: boolean; data?: JobsheetData[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();

      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      if (filters?.employee_id) params.append('employee_id', filters.employee_id);
      if (filters?.service_type) params.append('service_type', filters.service_type);

      const url = `${API_BASE_URL}/api/jobsheet/all/?${params.toString()}`;
      const response = await axios.get(url, { headers });

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: 'Failed to load jobsheets' };
      }
    } catch (error: any) {
      console.error('Get all jobsheets error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Get jobsheet details
  async getJobsheetDetail(jobsheetId: string): Promise<{ success: boolean; data?: JobsheetData; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/jobsheet/${jobsheetId}/`, { headers });

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: 'Failed to load jobsheet details' };
      }
    } catch (error: any) {
      console.error('Get jobsheet detail error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Update office use fields (Admin only)
  async updateOfficeUseFields(jobsheetId: string, data: {
    bill_no?: string;
    manpower_charges?: number;
    petrol?: number;
    food_tea?: number;
    profit?: number;
    net_profit?: number;
    incentive_percentage?: number;
  }): Promise<{ success: boolean; data?: JobsheetData; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.put(`${API_BASE_URL}/api/jobsheet/${jobsheetId}/update-office/`, data, { headers });

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: 'Failed to update office fields' };
      }
    } catch (error: any) {
      console.error('Update office fields error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Get jobsheets for review (Team Lead & Admin)
  async getJobsheetsForReview(userId: string, filters?: {
    from_date?: string;
    to_date?: string;
    employee_id?: string;
    status?: string;
  }): Promise<{ success: boolean; data?: JobsheetReviewListItem[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      params.append('user_id', userId);

      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      if (filters?.employee_id) params.append('employee_id', filters.employee_id);
      if (filters?.status) params.append('status', filters.status);

      const url = `${API_BASE_URL}/api/jobsheet/review/?${params.toString()}`;
      const response = await axios.get(url, { headers });

      if (response.status === 200) {
        // Handle new response format with metadata
        const data = response.data.success ? response.data.data : response.data;
        return { success: true, data: data };
      } else {
        return { success: false, error: 'Failed to load jobsheets for review' };
      }
    } catch (error: any) {
      console.error('Get jobsheets for review error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Get all jobsheets with status tracking for admin view
  async getAllJobsheetsAdmin(userId: string, filters?: {
    from_date?: string;
    to_date?: string;
    employee_id?: string;
    status?: string;
  }): Promise<{ success: boolean; data?: JobsheetReviewListItem[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      params.append('user_id', userId);

      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      if (filters?.employee_id) params.append('employee_id', filters.employee_id);
      if (filters?.status) params.append('status', filters.status);

      const url = `${API_BASE_URL}/api/jobsheet/admin/all/?${params.toString()}`;
      const response = await axios.get(url, { headers });

      if (response.status === 200) {
        // Handle new response format with metadata
        const data = response.data.success ? response.data.data : response.data;
        return { success: true, data: data };
      } else {
        return { success: false, error: 'Failed to load all jobsheets' };
      }
    } catch (error: any) {
      console.error('Get all jobsheets admin error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Get detailed jobsheet information (Admin view-only)
  async getJobsheetDetailAdmin(jobsheetId: string, userId: string): Promise<{ success: boolean; data?: JobsheetData; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      params.append('user_id', userId);

      const url = `${API_BASE_URL}/api/jobsheet/admin/${jobsheetId}/?${params.toString()}`;
      const response = await axios.get(url, { headers });

      if (response.status === 200) {
        // Handle new response format with access info
        const data = response.data.success ? response.data.data : response.data;
        return { success: true, data: data };
      } else {
        return { success: false, error: 'Failed to load jobsheet details' };
      }
    } catch (error: any) {
      console.error('Get jobsheet detail admin error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Review jobsheet (Approve/Reject)
  async reviewJobsheet(jobsheetId: string, reviewData: JobsheetReviewData): Promise<{ success: boolean; data?: JobsheetData; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post(`${API_BASE_URL}/api/jobsheet/${jobsheetId}/review/`, reviewData, { headers });

      if (response.status === 200) {
        return { success: true, data: response.data.jobsheet };
      } else {
        return { success: false, error: 'Failed to submit review' };
      }
    } catch (error: any) {
      console.error('Review jobsheet error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Export jobsheet as PDF
  async exportJobsheetPDF(jobsheetId: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      // Remove content-type for file download
      delete headers['Content-Type'];

      const response = await axios.get(`${API_BASE_URL}/api/jobsheet/${jobsheetId}/export/pdf/`, {
        headers,
        responseType: 'blob'
      });

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: 'Failed to export PDF' };
      }
    } catch (error: any) {
      console.error('Export PDF error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }

  // Export all jobsheets as Excel with filters
  async exportJobsheetsExcel(filters?: {
    from_date?: string;
    to_date?: string;
    employee_id?: string;
    status?: string;
  }): Promise<{ success: boolean; data?: Blob; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      // Remove content-type for file download
      delete headers['Content-Type'];

      const params = new URLSearchParams();
      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      if (filters?.employee_id) params.append('employee_id', filters.employee_id);
      if (filters?.status) params.append('status', filters.status);

      const url = `${API_BASE_URL}/api/jobsheet/export/excel/?${params.toString()}`;
      const response = await axios.get(url, {
        headers,
        responseType: 'blob'
      });

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: 'Failed to export Excel' };
      }
    } catch (error: any) {
      console.error('Export Excel error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error'
      };
    }
  }
}

const jobsheetService = new JobsheetService();
export default jobsheetService;