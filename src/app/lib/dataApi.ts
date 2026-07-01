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

export function listUsersApi(roles?: string[]): Promise<ApiUser[]> {
  const qs = roles?.length ? `?roles=${encodeURIComponent(roles.join(","))}` : "";
  return apiFetch<ApiUser[]>(`/users${qs}`);
}

export function listMedicinesApi(): Promise<Medicine[]> {
  return apiFetch<Medicine[]>("/medicines");
}
