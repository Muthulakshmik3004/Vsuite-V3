import axios from 'axios';
import API_BASE_URL from '../../config';
import RNFetchBlob from 'react-native-blob-util';
import * as Sharing from 'expo-sharing';

export interface TimeSlot {
  time: string;
  activity: string | null;
  label: string;
}

export interface Activity {
  id: number | string;
  time: string;
  type: string;
  title: string;
  notes: string;
}

export interface TimesheetData {
  employee_id: string;
  employeeName: string;
  date: string;
  timeSlots: TimeSlot[];
  activities: Activity[];
}

export interface TimesheetResponse {
  success: boolean;
  message: string;
  data?: any;
}

const timesheetService = {
  // Fetch employee details from Sign Up and Login credentials
  getEmployeeDetails: async (identifier: string): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/employees/${identifier}/`);
      return {
        success: true,
        message: 'Employee details retrieved successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error retrieving employee details:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to retrieve employee details',
      };
    }
  },

  saveTimesheet: async (timesheetData: TimesheetData): Promise<TimesheetResponse> => {
    try {
      // Save complete timesheet as single document
      const response = await axios.post(`${API_BASE_URL}/api/timesheet/save/`, {
        employee_id: timesheetData.employee_id, // Use the actual employee ID from the data
        date: timesheetData.date,
        activities: timesheetData.activities,
        time_slots: timesheetData.timeSlots,
      });

      return {
        success: true,
        message: response.data.message || 'Timesheet saved successfully',
      };
    } catch (error: any) {
      console.error('Error saving timesheet:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to save timesheet',
      };
    }
  },

  getTimesheetByEmployeeAndDate: async (
    employeeId: string,
    date: string
  ): Promise<TimesheetResponse> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/timesheet/day/`,
        {
          params: {
            employee_id: employeeId,
            date: date,
          },
        }
      );
      return {
        success: true,
        message: 'Timesheet retrieved successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error retrieving timesheet:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to retrieve timesheet',
      };
    }
  },

  getTimesheetByEmployee: async (employeeId: string): Promise<TimesheetResponse> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/timesheet/day/`,
        {
          params: {
            employee_id: employeeId,
          },
        }
      );
      return {
        success: true,
        message: 'Timesheets retrieved successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error retrieving timesheets:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to retrieve timesheets',
      };
    }
  },

  getTimesheetByDate: async (date: string): Promise<TimesheetResponse> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/timesheet/day/`,
        {
          params: {
            date: date,
          },
        }
      );
      return {
        success: true,
        message: 'Timesheets retrieved successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error retrieving timesheets:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to retrieve timesheets',
      };
    }
  },

  getAllEmployeesTimesheets: async (fromDate: string, toDate: string, search?: string, department?: string): Promise<TimesheetResponse> => {
    try {
      const params: any = { from_date: fromDate, to_date: toDate };
      if (search) params.search = search;
      if (department) params.department = department;

      const response = await axios.get(
        `${API_BASE_URL}/api/timesheet/all/`,
        { params }
      );
      return {
        success: true,
        message: 'All employees timesheets retrieved successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error retrieving all employees timesheets:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to retrieve all employees timesheets',
      };
    }
  },

  reviewTimesheet: async (reviewData: {
    employee_id: string;
    date: string;
    status: 'approved' | 'rejected';
    reviewer_id: string;
    reviewer_name: string;
    review_notes?: string;
  }): Promise<TimesheetResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/timesheet/review/`, reviewData);
      return {
        success: true,
        message: response.data.message || 'Timesheet reviewed successfully',
        data: response.data.timesheet,
      };
    } catch (error: any) {
      console.error('Error reviewing timesheet:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to review timesheet',
      };
    }
  },

  exportTimesheetPDF: async (employee_id: string, date: string): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
      // For React Native, we'll get the download URL instead of blob
      const downloadUrl = `${API_BASE_URL}/api/timesheet/export/pdf/?employee_id=${employee_id}&date=${date}`;
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

  exportTimesheetExcel: async (employee_id: string, date: string): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
      // For React Native, we'll get the download URL instead of blob
      const downloadUrl = `${API_BASE_URL}/api/timesheet/export/excel/?employee_id=${employee_id}&date=${date}`;
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

  getEmployeeTimesheetHistory: async (employeeId: string): Promise<TimesheetResponse> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/timesheet/employee/${employeeId}/history/`
      );
      return {
        success: true,
        message: 'Timesheet history retrieved successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('Error retrieving timesheet history:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to retrieve timesheet history',
      };
    }
  },

  exportBulkTimesheetExcel: async (fromDate: string, toDate: string, department?: string): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
      let downloadUrl = `${API_BASE_URL}/api/timesheet/export/excel/bulk/?from_date=${fromDate}&to_date=${toDate}`;
      if (department && department !== '') {
        downloadUrl += `&department=${encodeURIComponent(department)}`;
      }

      // For React Native, open the URL in browser which will trigger download
      // This is more reliable than trying to download directly
      const Linking = require('react-native').Linking;

      await Linking.openURL(downloadUrl);

      return {
        success: true,
        message: 'Bulk Excel download initiated in browser',
        data: downloadUrl,
      };
    } catch (error: any) {
      console.error('Error opening bulk Excel download URL:', error);
      return {
        success: false,
        message: 'Failed to open bulk Excel download',
      };
    }
  },
};

export default timesheetService;
