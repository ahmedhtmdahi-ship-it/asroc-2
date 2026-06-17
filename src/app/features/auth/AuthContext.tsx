import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { mockUsers } from "@/app/data/mockUsers";
import type { User, UserRole } from "@/app/types/user";

const AUTH_STORAGE_KEY = "asorc_current_user";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => User | null;
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
      return "/";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getInitialUser());

  const login = (username: string, password: string) => {
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
  };

  const logout = () => {
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
      login,
      logout,
      hasRole,
    }),
    [user]
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
