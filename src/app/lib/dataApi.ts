import { apiFetch } from "./apiClient";
import type { Medicine } from "@/app/types/medicine";

// مستخدم الـ API (camelCase، بدون الـ hash) — نفس شكل authApi.
export interface ApiUser {
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
}

// دليل مصغّر — السيرفر عمدًا لا يرجّع nationalId/phone من /users/lookup (تقليل PII).
export interface ApiUserLookup {
  id: string;
  name: string;
  role: string;
  department?: string | null;
  financialNumber?: string | null;
  jobTitle?: string | null;
  permissions: string[];
  isActive: boolean;
}

export function listUsersApi(roles?: string[]): Promise<ApiUser[]> {
  const qs = roles?.length ? `?roles=${encodeURIComponent(roles.join(","))}` : "";
  return apiFetch<ApiUser[]>(`/users${qs}`);
}

export function lookupUsersApi(roles?: string[]): Promise<ApiUserLookup[]> {
  const qs = roles?.length ? `?roles=${encodeURIComponent(roles.join(","))}` : "";
  return apiFetch<ApiUserLookup[]>(`/users/lookup${qs}`);
}

export interface UpdateUserPayload {
  role?: string;
  permissions?: string[];
  isActive?: boolean;
}

export function setUserActiveApi(id: string, isActive: boolean): Promise<ApiUser> {
  return updateUserApi(id, { isActive });
}

// تحديث عام لمستخدم (الدور/الصلاحيات/التفعيل) — PATCH /users/:id
export function updateUserApi(id: string, payload: UpdateUserPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface CreateUserPayload {
  username: string;
  password: string;
  name: string;
  role: string;
  permissions?: string[];
  financialNumber?: string;
  jobTitle?: string;
  workPlace?: string;
  department?: string;
  nationalId?: string;
  phone?: string;
  workType?: string;
}

export function createUserApi(payload: CreateUserPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface ApiAuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  request_id: string | null;
  status_before: string | null;
  status_after: string | null;
  created_at: string;
}

export function listAuditLogsApi(limit = 500): Promise<ApiAuditLog[]> {
  return apiFetch<ApiAuditLog[]>(`/audit-logs?limit=${limit}`);
}

export function countAuditLogsApi(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/audit-logs/count");
}

export function listMedicinesApi(): Promise<Medicine[]> {
  return apiFetch<Medicine[]>("/medicines");
}

export function createMedicineApi(payload: Omit<Medicine, "id" | "updatedAt">): Promise<Medicine> {
  return apiFetch<Medicine>("/medicines", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMedicineApi(
  id: string,
  payload: Partial<Omit<Medicine, "id" | "updatedAt">>,
): Promise<Medicine> {
  return apiFetch<Medicine>(`/medicines/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteMedicineApi(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/medicines/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Notifications ───────────────────────────────────────────────────
export interface ApiNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  requestId: string | null;
  unread: boolean;
  icon: string | null;
  color: string | null;
  bg: string | null;
  createdAt: string;
}

// السيرفر بيحدد المستخدم من التوكن — مفيش داعي لباراميتر userId.
export function listNotificationsApi(limit = 50): Promise<ApiNotification[]> {
  return apiFetch<ApiNotification[]>(`/notifications?limit=${limit}`);
}

export function markNotificationsReadApi(ids?: string[]): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/notifications/mark-read", {
    method: "PATCH",
    body: JSON.stringify({ ids }),
  });
}

// ─── Security Logs ───────────────────────────────────────────────────
export interface ApiSecurityLog {
  id: string;
  requestId: string | null;
  employeeId: string | null;
  employeeName: string | null;
  type: string;
  officerId: string | null;
  officerName: string | null;
  notes: string | null;
  createdAt: string;
}

export function listSecurityLogsApi(limit = 200): Promise<ApiSecurityLog[]> {
  return apiFetch<ApiSecurityLog[]>(`/security-logs?limit=${limit}`);
}
