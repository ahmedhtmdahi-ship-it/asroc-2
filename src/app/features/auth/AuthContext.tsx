import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { clearToken, getToken, setToken } from "@/app/lib/apiClient";
import { apiUserToUser, loginRequest, meRequest } from "@/app/lib/authApi";
import type { User, UserRole } from "@/app/types/user";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function profileRowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    password: "",
    financialNumber: (row.financial_number as string) ?? undefined,
    name: row.name as string,
    jobTitle: (row.job_title as string) ?? undefined,
    workPlace: (row.work_place as string) ?? undefined,
    department: (row.department as string) ?? undefined,
    nationalId: (row.national_id as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    workType: (row.work_type as string) ?? undefined,
    role: row.role as UserRole,
    permissions: (row.permissions as string[]) ?? [],
    isActive: (row.is_active as boolean) ?? true,
  };
}

export function getRedirectPathByRole(role: UserRole) {
  switch (role) {
    case "employee":
      return "/employee";
    case "manager":
    case "office_manager":
      return "/manager/approvals";
    case "security":
      return "/security";
    case "doctor":
      return "/doctor";
    case "pharmacy":
      return "/pharmacy";
    case "medical_admin":
      return "/medical-admin";
    case "pension_admin":
      return "/pension-admin";
    case "super_admin":
      return "/dashboard";
    default:
      return "/employee";
  }
}

export function getHomePathByRole(role?: UserRole): string {
  if (!role) return "/";
  return getRedirectPathByRole(role);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // عند الفتح: لو فيه توكن محفوظ نستعيد جلسة المستخدم من السيرفر.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }

    let cancelled = false;
    meRequest()
      .then((apiUser) => {
        if (!cancelled) setUser(apiUserToUser(apiUser));
      })
      .catch(() => {
        clearToken(); // توكن منتهي/غير صالح
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    try {
      const { token, user: apiUser } = await loginRequest(username.trim(), password);
      setToken(token);
      const loggedIn = apiUserToUser(apiUser);
      setUser(loggedIn);
      return loggedIn;
    } catch {
      return null; // بيانات دخول غير صحيحة أو السيرفر غير متاح
    }
  };

  const logout = async () => {
    clearToken();
    setUser(null);
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
      login,
      logout,
      hasRole,
    }),
    [user]
  );

  if (!ready) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
