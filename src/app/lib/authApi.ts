import { apiFetch } from "./apiClient";
import type { Permission, User, UserRole } from "@/app/types/user";

interface ApiUser {
  id: string;
  username: string;
  financialNumber?: string | null;
  name: string;
  jobTitle?: string | null;
  workPlace?: string | null;
  department?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  workType?: string | null;
  role: string;
  permissions: string[];
  isActive: boolean;
  mustChangePassword?: boolean;
}

// ✅ تم حذف password بالكامل
export function apiUserToUser(u: ApiUser): User {
  return {
    id: u.id,
    username: u.username,
    financialNumber: u.financialNumber ?? undefined,
    name: u.name,
    jobTitle: u.jobTitle ?? undefined,
    workPlace: u.workPlace ?? undefined,
    department: u.department ?? undefined,
    nationalId: u.nationalId ?? undefined,
    phone: u.phone ?? undefined,
    workType: u.workType ?? undefined,
    role: u.role as UserRole,
    permissions: u.permissions as Permission[],
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword ?? false,
  };
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<{ token: string; user: ApiUser }> {
  return apiFetch<{ token: string; user: ApiUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function meRequest(): Promise<ApiUser> {
  const res = await apiFetch<{ user: ApiUser }>("/auth/me");
  return res.user;
}

export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string,
): Promise<{ token: string; user: ApiUser }> {
  return apiFetch<{ token: string; user: ApiUser }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}