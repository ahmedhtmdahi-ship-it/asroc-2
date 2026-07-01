import { apiFetch } from "./apiClient";
import type { MedicalRequest } from "@/app/types/request";
import type { RequestStatus } from "@/app/types/workflow";

/**
 * عميل الطلبات الطبية — بيكلّم /requests على السيرفر.
 * جاهز لاستبدال استدعاءات Supabase جوه requestStore في جولة النضافة
 * (بتحويل الـ store لـ async واستخدام الـ id اللي بيرجع من السيرفر).
 */

export function listRequestsApi(params?: {
  employeeId?: string;
  status?: RequestStatus;
}): Promise<MedicalRequest[]> {
  const q = new URLSearchParams();
  if (params?.employeeId) q.set("employeeId", params.employeeId);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<MedicalRequest[]>(`/requests${qs ? `?${qs}` : ""}`);
}

export function getRequestApi(id: string): Promise<MedicalRequest> {
  return apiFetch<MedicalRequest>(`/requests/${id}`);
}

export function createRequestApi(
  input: Partial<MedicalRequest>,
): Promise<MedicalRequest> {
  return apiFetch<MedicalRequest>("/requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function transitionRequestApi(
  id: string,
  status: RequestStatus,
  note?: string,
): Promise<MedicalRequest> {
  return apiFetch<MedicalRequest>(`/requests/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ status, note }),
  });
}

export function patchRequestApi(
  id: string,
  fields: Partial<MedicalRequest>,
): Promise<MedicalRequest> {
  return apiFetch<MedicalRequest>(`/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}
