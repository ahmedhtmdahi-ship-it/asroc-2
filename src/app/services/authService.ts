import { apiClient } from './apiClient';

export interface LoginResponse {
  message: string;
  token: string;
  token_type: string;
  user: ApiUser;
}

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  financial_number: string | null;
  department: string | null;
  job_title: string | null;
  is_active: boolean;
  last_login_at: string | null;
  roles: string[];
  permissions: string[];
  work_shift?: "day" | "shift";
  clinic?: "medical_center" | "shift_clinic" | null;
}

// Map backend role names to frontend role names
export function mapBackendRole(backendRole: string): string {
  const roleMap: Record<string, string> = {
    'system_admin': 'super_admin',
    'internal_pharmacy': 'pharmacy',
    'external_pharmacy': 'pharmacy',
    'retired_employee': 'employee',
    'top_management': 'super_admin',
    'office_manager': 'office_manager',
  };
  return roleMap[backendRole] || backendRole;
}

export const authService = {
  async login(identifier: string, password: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', { identifier, password });
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('asorc_token');
    localStorage.removeItem('asorc_api_user');
  },

  async me(): Promise<ApiUser> {
    return apiClient.get<ApiUser>('/auth/me');
  },

  saveToken(token: string): void {
    localStorage.setItem('asorc_token', token);
  },

  getToken(): string | null {
    return localStorage.getItem('asorc_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
