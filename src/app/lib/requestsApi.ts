import { apiFetch } from "./apiClient";
import type { MedicalRequest, ReferralData } from "@/app/types/request";
import type { RequestStatus } from "@/app/types/workflow";

/**
 * عميل الطلبات الطبية — بيكلّم /requests على السيرفر.
 */

// السيرفر بيرجّع الإحالة تحت المفتاح `referral` (علاقة Prisma)، بينما الواجهة كلها
// بتقرأ `referralData`. بنوحّد الشكل هنا في مكان واحد عشان الإحالات ما تختفيش بعد المزامنة.
type RawRequest = Omit<MedicalRequest, "referralData"> & {
  referral?: ReferralData | null;
  referralData?: ReferralData | null;
};

function normalizeRequest(raw: RawRequest): MedicalRequest {
  const { referral, referralData, ...rest } = raw;
  const merged = referralData ?? referral ?? undefined;
  return {
    ...(rest as MedicalRequest),
    referralData: merged ?? undefined,
  };
}

export async function listRequestsApi(params?: {
  employeeId?: string;
  status?: RequestStatus;
}): Promise<MedicalRequest[]> {
  const q = new URLSearchParams();
  if (params?.employeeId) q.set("employeeId", params.employeeId);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  const rows = await apiFetch<RawRequest[]>(`/requests${qs ? `?${qs}` : ""}`);
  return rows.map(normalizeRequest);
}

export async function getRequestApi(id: string): Promise<MedicalRequest> {
  const row = await apiFetch<RawRequest>(`/requests/${id}`);
  return normalizeRequest(row);
}

export async function createRequestApi(
  input: Partial<MedicalRequest>,
): Promise<MedicalRequest> {
  const row = await apiFetch<RawRequest>("/requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeRequest(row);
}

export async function transitionRequestApi(
  id: string,
  status: RequestStatus,
  note?: string,
): Promise<MedicalRequest> {
  const row = await apiFetch<RawRequest>(`/requests/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ status, note }),
  });
  return normalizeRequest(row);
}

export async function patchRequestApi(
  id: string,
  fields: Partial<MedicalRequest>,
): Promise<MedicalRequest> {
  const row = await apiFetch<RawRequest>(`/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
  return normalizeRequest(row);
}
