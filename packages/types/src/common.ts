// Common types used across apps

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Session {
  hawkerId: string;
  tableNumber: string;
  timestamp: number;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface UserContext {
  id: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
  stallId?: string;
}