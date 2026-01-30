import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserData {
  id?: number;
  name: string;
  username: string;
  email: string;
  role: string;
  emp_id: string;
  department?: string;
  team_leader_id?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  last_login?: string;
  image?: string;
}

/**
 * Get user data from AsyncStorage
 */
export const getUserData = async (): Promise<UserData | null> => {
  try {
    const userDataString = await AsyncStorage.getItem('user');
    if (userDataString) {
      return JSON.parse(userDataString);
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Check if user has admin role
 */
export const isAdmin = (user: UserData | null): boolean => {
  if (!user) return false;
  
  const role = user.role?.toLowerCase();
  return role === 'admin' || 
         role === 'administrator' || 
         user.username === 'admin';
};

/**
 * Check if user is team leader
 */
export const isTeamLeader = (user: UserData | null): boolean => {
  if (!user) return false;
  
  const role = user.role?.toLowerCase();
  return role === 'team leader' || 
         role === 'team_leader' || 
         role === 'teamleader';
};

/**
 * Check if user is regular employee
 */
export const isEmployee = (user: UserData | null): boolean => {
  if (!user) return false;
  
  const role = user.role?.toLowerCase();
  return role === 'employee' || 
         role === 'user' || 
         role === 'staff';
};

/**
 * Get user role with fallback to empId storage
 */
export const getCurrentUserRole = async (): Promise<string | null> => {
  try {
    // Try to get user data from AsyncStorage
    const userData = await getUserData();
    if (userData?.role) {
      return userData.role;
    }

    // Fallback to role storage
    const role = await AsyncStorage.getItem('role');
    if (role) {
      return role;
    }

    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * Get user ID with fallback to empId storage
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    // Try to get user data from AsyncStorage
    const userData = await getUserData();
    if (userData?.emp_id) {
      return userData.emp_id;
    }

    // Fallback to empId storage
    const empId = await AsyncStorage.getItem('empId');
    if (empId) {
      return empId;
    }

    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

/**
 * Check if user has access to admin features
 */
export const hasAdminAccess = async (): Promise<boolean> => {
  const userData = await getUserData();
  return isAdmin(userData);
};

/**
 * Check if user has access to team leader features
 */
export const hasTeamLeaderAccess = async (): Promise<boolean> => {
  const userData = await getUserData();
  return isTeamLeader(userData);
};

/**
 * Check if user has access to employee features
 */
export const hasEmployeeAccess = async (): Promise<boolean> => {
  const userData = await getUserData();
  return isEmployee(userData);
};

/**
 * Get appropriate access level for user
 */
export const getUserAccessLevel = async (): Promise<'admin' | 'team_leader' | 'employee' | 'none'> => {
  const userData = await getUserData();
  
  if (isAdmin(userData)) return 'admin';
  if (isTeamLeader(userData)) return 'team_leader';
  if (isEmployee(userData)) return 'employee';
  
  return 'none';
};

/**
 * Validate user authentication
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const userData = await getUserData();
  return !!userData;
};

/**
 * Clear user data from storage
 */
export const clearUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('role');
    await AsyncStorage.removeItem('empId');
    await AsyncStorage.removeItem('token');
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};