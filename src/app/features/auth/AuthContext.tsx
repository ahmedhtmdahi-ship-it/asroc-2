import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { clearToken, getToken, setToken } from "@/app/lib/apiClient";
import {
  apiUserToUser,
  changePasswordRequest,
  loginRequest,
  meRequest,
} from "@/app/lib/authApi";
import { PERMISSIONS } from "@asroc/shared/roles.js";
import type { User, UserRole, Permission } from "@/app/types/user";

function parsePermissions(raw: unknown): Permission[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Permission => typeof item === "string" && PERMISSIONS.includes(item as Permission),
  );
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
   hasPermission: (permissions: Permission | Permission[]) => boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function profileRowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    financialNumber: (row.financial_number as string) ?? undefined,
    name: row.name as string,
    jobTitle: (row.job_title as string) ?? undefined,
    workPlace: (row.work_place as string) ?? undefined,
    department: (row.department as string) ?? undefined,
    nationalId: (row.national_id as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    workType: (row.work_type as string) ?? undefined,
    role: row.role as UserRole,
    permissions: parsePermissions(row.permissions),
    isActive: (row.is_active as boolean) ?? true,
  };
}

export function getRedirectPathByRole(role: UserRole): string {
  const map: Record<UserRole, string> = {
    employee: "/employee",
    manager: "/dashboard",
    office_manager: "/dashboard",
    doctor: "/doctor",
    pharmacy: "/pharmacy",
    security: "/security",
    medical_admin: "/medical-admin",
    pension_admin: "/pension-admin",
    super_admin: "/dashboard",
  };
  return map[role] ?? "/dashboard";
}

export function getHomePathByRole(role?: UserRole): string {
  if (!role) return "/dashboard";
  return getRedirectPathByRole(role);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const hasPermission = (perms: Permission | Permission[]) => {
  if (!user) return false;
  const permList = Array.isArray(perms) ? perms : [perms];
  return permList.every((p) => user.permissions.includes(p));
};
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

  // بيرمي ApiError عند الفشل (باسورد حالي غلط...) عشان الصفحة تعرض الرسالة.
  const changePassword = async (currentPassword: string, newPassword: string) => {
    const { token, user: apiUser } = await changePasswordRequest(
      currentPassword,
      newPassword,
    );
    setToken(token);
    setUser(apiUserToUser(apiUser));
  };

  const value = useMemo(
  () => ({
    user,
    isAuthenticated: Boolean(user),
    login,
    logout,
    hasRole,
    hasPermission,  // ✅
    changePassword,
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
