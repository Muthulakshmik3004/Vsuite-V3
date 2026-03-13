import axios from 'axios';
import API_BASE_URL from '../../config';

export interface Notification {
  id: string;
  user_id: string;
  user_id_type: string;
  title: string;
  message: string;
  notification_type: string;
  reference_id: string;
  reference_type: string;
  is_read: boolean;
  created_at: string;
}

const notificationService = {
  // Get all notifications for a user
  getNotifications: async (userId: string): Promise<{ success: boolean; notifications?: Notification[]; error?: string }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications/${userId}/`);
      console.log('[NotificationService] API Response:', response.data);
      
      if (response.data && response.data.notifications) {
        return {
          success: true,
          notifications: response.data.notifications,
        };
      }
      
      return {
        success: false,
        error: 'No notifications found',
      };
    } catch (error: any) {
      console.error('[NotificationService] Error fetching notifications:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch notifications',
      };
    }
  },

  // Get unread notification count
  getUnreadCount: async (userId: string): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications/${userId}/unread-count/`);
      console.log('[NotificationService] Unread Count Response:', response.data);
      
      return {
        success: true,
        count: response.data.unread_count || 0,
      };
    } catch (error: any) {
      console.error('[NotificationService] Error fetching unread count:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch unread count',
      };
    }
  },

  // Mark a notification as read
  markAsRead: async (notificationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/notifications/mark-read/${notificationId}/`);
      console.log('[NotificationService] Mark as read Response:', response.data);
      
      return {
        success: response.data.success || false,
      };
    } catch (error: any) {
      console.error('[NotificationService] Error marking notification as read:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to mark notification as read',
      };
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/notifications/mark-all-read/${userId}/`);
      console.log('[NotificationService] Mark all as read Response:', response.data);
      
      return {
        success: response.data.success || false,
      };
    } catch (error: any) {
      console.error('[NotificationService] Error marking all notifications as read:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to mark all notifications as read',
      };
    }
  },
};

export default notificationService;
