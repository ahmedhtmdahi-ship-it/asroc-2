import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { mockUsers } from "@/app/data/mockUsers";
import type { User, UserRole, Permission } from "@/app/types/user";
import { authService, mapBackendRole, type ApiUser } from "@/app/services/authService";

const AUTH_STORAGE_KEY = "asorc_current_user";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isApiConnected: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getInitialUser() {
  if (typeof window === "undefined") return null;

  const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser) as User;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

// الكل يدخل على داشبورد واحدة — الاختلاف في الودجتس والسايدبار حسب الدور
export function getRedirectPathByRole(_role: UserRole) {
  return "/dashboard";
}

// Returns the "home" path for the current role — used for backLinks and logout redirects
export function getHomePathByRole(role?: UserRole): string {
  if (!role) return "/";
  return getRedirectPathByRole(role);
}

// Map an ApiUser from the backend to the frontend User shape
function mapApiUserToUser(apiUser: ApiUser): User {
  const backendRole = apiUser.roles?.[0] ?? '';
  const mappedRole = mapBackendRole(backendRole) as UserRole;

  // Derive permissions from role if the API doesn't provide granular ones
  const rolePermissionMap: Record<string, Permission[]> = {
    super_admin: ['all'],
    manager: ['approve_request', 'reject_request', 'postpone_request', 'view_reports', 'print_documents'],
    office_manager: ['approve_request', 'reject_request', 'postpone_request', 'view_reports', 'print_documents'],
    employee: ['create_request', 'view_own_requests', 'view_medical_history'],
    security: ['security_check_out', 'security_check_in'],
    doctor: ['diagnose_patient', 'create_prescription', 'create_referral', 'create_sick_leave', 'view_medical_history'],
    pharmacy: ['dispense_prescription', 'manage_inventory', 'dispense_regular_treatment', 'dispense_monthly_treatment'],
    medical_admin: ['manage_referrals', 'approve_referral', 'manage_monthly_treatment', 'view_reports', 'print_documents'],
    pension_admin: ['manage_pensioners', 'view_reports', 'print_documents'],
  };

  const permissions: Permission[] =
    apiUser.permissions && apiUser.permissions.length > 0
      ? (apiUser.permissions as Permission[])
      : (rolePermissionMap[mappedRole] ?? ['view_own_requests']);

  return {
    id: apiUser.financial_number || String(apiUser.id),
    username: apiUser.financial_number || apiUser.email,
    password: '',
    financialNumber: apiUser.financial_number || '',
    name: apiUser.name,
    jobTitle: apiUser.job_title ?? undefined,
    department: apiUser.department ?? undefined,
    role: mappedRole,
    permissions,
    isActive: apiUser.is_active,
    workShift: apiUser.work_shift,
    clinic: apiUser.clinic ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getInitialUser());
  const [isLoading, setIsLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);

  // Restore API connection from stored token on app init
  useEffect(() => {
    const token = authService.getToken();
    if (!token) return;

    setIsLoading(true);
    authService.me()
      .then((apiUser) => {
        const mappedUser = mapApiUserToUser(apiUser);
        setUser(mappedUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mappedUser));
        setIsApiConnected(true);
      })
      .catch(() => {
        // Token expired or invalid — clear it, keep localStorage user for mock fallback
        localStorage.removeItem('asorc_token');
        localStorage.removeItem('asorc_api_user');
        setIsApiConnected(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    setIsLoading(true);

    try {
      // Attempt real API login first
      const response = await authService.login(username, password);

      authService.saveToken(response.token);
      localStorage.setItem('asorc_api_user', JSON.stringify(response.user));

      const mappedUser = mapApiUserToUser(response.user);
      setUser(mappedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mappedUser));
      setIsApiConnected(true);

      return mappedUser;
    } catch {
      // API unavailable or credentials rejected — fall back to mock data
      setIsApiConnected(false);

      const foundUser = mockUsers.find(
        (item) =>
          item.username.trim().toLowerCase() === username.trim().toLowerCase() &&
          item.password === password &&
          item.isActive
      );

      if (!foundUser) return null;

      setUser(foundUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));

      return foundUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Best-effort API logout — ignore errors (token may already be invalid)
    authService.logout().catch(() => undefined);

    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!user) return false;

    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isApiConnected,
      login,
      logout,
      hasRole,
    }),
    [user, isLoading, isApiConnected]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
