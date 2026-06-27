import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/app/lib/supabaseClient";
import { logger } from "@/app/lib/logger";
import type { Permission, User, UserRole } from "@/app/types/user";
import { DEV_TEST_USERS } from "@/app/data/testUsers";
import { mockUsers } from "@/app/data/mockUsers";
import { mockManagers } from "@/app/data/mockManagers";
import { rolePermissions } from "@/app/data/rolePermissions";

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
    financialNumber: (row.financial_number as string) ?? undefined,
    name: row.name as string,
    jobTitle: (row.job_title as string) ?? undefined,
    workPlace: (row.work_place as string) ?? undefined,
    department: (row.department as string) ?? undefined,
    nationalId: (row.national_id as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    workType: (row.work_type as string) ?? undefined,
    role: row.role as UserRole,
    permissions: (row.permissions as Permission[]) ?? [],
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

async function fetchProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, name, financial_number, job_title, work_place, department, role, permissions, is_active, national_id, phone, work_type")
      .eq("id", userId)
      .single();

    if (error) {
      logger.error("[fetchProfile] Supabase error:", error.message, error);
      return null;
    }
    if (!data) {
      logger.error("[fetchProfile] No profile found for userId:", userId);
      return null;
    }
    return profileRowToUser(data as Record<string, unknown>);
  } catch (e) {
    logger.error("[fetchProfile] Exception:", e);
    return null;
  }
}

function normalizeArabic(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

const TRUE_MANAGER_FINS = new Set(mockManagers.map((m) => m.financialNumber));

const PROTECTED_ROLES: UserRole[] = [
  "super_admin", "medical_admin", "doctor", "pharmacy", "security", "pension_admin",
];

function resolveRole(user: User): User {
  if (PROTECTED_ROLES.includes(user.role)) return user;
  if (user.financialNumber?.startsWith("0") && user.financialNumber.length <= 4) return user;

  const jobTitle = user.jobTitle || "";
  let role: UserRole = user.role;

  if (TRUE_MANAGER_FINS.has(user.financialNumber ?? "")) {
    role = "manager";
  } else if (jobTitle.includes("مساعد مكلف")) {
    role = "office_manager";
  } else if (role === "manager" || role === "office_manager") {
    role = "employee";
  }

  if (role === user.role) return user;
  return { ...user, role, permissions: rolePermissions[role] };
}

// Accepted password for DEV_TEST_USERS (which carry no stored password).
// Set VITE_DEV_PASSWORD in .env.local to override — never hardcode here.
const DEV_UNIVERSAL_PASSWORD = import.meta.env.VITE_DEV_PASSWORD ?? "test123";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const inFlightProfileFetch = new Map<string, Promise<User | null>>();

  const fetchProfileSingleflight = async (userId: string): Promise<User | null> => {
    const existing = inFlightProfileFetch.get(userId);
    if (existing) return existing;

    const p = fetchProfile(userId).finally(() => {
      inFlightProfileFetch.delete(userId);
    });

    inFlightProfileFetch.set(userId, p);
    return p;
  };

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(async ({ data }: { data: { session: Session | null } }) => {
        if (cancelled) return;
        if (data.session?.user) {
          const profile = await fetchProfileSingleflight(data.session.user.id);
          if (!cancelled) setUser(profile);
        }
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (cancelled) return;
        if (session?.user) {
          const profile = await fetchProfileSingleflight(session.user.id);
          if (!cancelled) setUser(profile);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    if (import.meta.env.DEV) {
      const email = `${username.trim().toLowerCase()}@asroc.local`;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (!error && data.user) {
          const profile = await fetchProfile(data.user.id);
          if (profile) {
            setUser(profile);
            return profile;
          }
          logger.warn("[DEV login] profile fetch failed, falling back to mocks");
        }
      } catch (e) {
        logger.warn("[DEV login] Supabase login failed, falling back to mocks", e);
      }

      const trimmedUsername = username.trim().toLowerCase();
      const normalizedPassword = normalizeArabic(password.trim());
      const allDevUsers = [...DEV_TEST_USERS, ...mockUsers];

      const found = allDevUsers.find((u) => {
        if (u.username !== trimmedUsername) return false;
        // Test users have no stored password — accept the universal dev password.
        if (!u.password) return normalizedPassword === normalizeArabic(DEV_UNIVERSAL_PASSWORD);
        // Mock users (real employees) are matched against their own password.
        return normalizeArabic(u.password) === normalizedPassword;
      });

      if (found) {
        const resolved = resolveRole(found);
        setUser(resolved);
        return resolved;
      }

      return null;
    }

    const email = `${username.trim().toLowerCase()}@asroc.local`;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logger.error("[login] Supabase auth error:", error.message);
      return null;
    }
    if (!data.user) {
      logger.error("[login] No user returned from Supabase auth");
      return null;
    }

    const profile = await fetchProfile(data.user.id);
    if (!profile) {
      logger.error("[login] Profile fetch failed for user:", data.user.id, data.user.email);
    }
    return profile;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout, hasRole }),
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
