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

async function fetchProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) return null;
    return profileRowToUser(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      if (data.session?.user) {
        const profile = await fetchProfile(data.session.user.id);
        setUser(profile);
      }
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(profile);
        } else {
          setUser(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    const email = `${username.trim().toLowerCase()}@asroc.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) return null;

    const profile = await fetchProfile(data.user.id);
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
