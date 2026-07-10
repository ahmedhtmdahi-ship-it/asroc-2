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

// ─── المرفقات ────────────────────────────────────────────────────────

export interface RequestAttachmentRecord {
  id: string;
  requestId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}

/** رفع ملف واحد لطلب — السيرفر بيتحقق من النوع الفعلي (PNG/JPG/PDF) والحجم (5MB). */
export async function uploadRequestAttachmentApi(
  requestId: string,
  file: File,
): Promise<RequestAttachmentRecord> {
  const form = new FormData();
  form.append("file", file, file.name);
  return apiFetch<RequestAttachmentRecord>(
    `/requests/${encodeURIComponent(requestId)}/attachments`,
    { method: "POST", body: form },
  );
}

/** رابط تنزيل مرفق — الواجهة بتفتح الرابط ومعاه التوكن عبر fetch (blob). */
export async function downloadRequestAttachmentApi(
  requestId: string,
  attachmentId: string,
  fileName: string,
): Promise<void> {
  const { getToken } = await import("./apiClient");
  const base =
    (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
    "http://localhost:4000";
  const res = await fetch(
    `${base}/requests/${encodeURIComponent(requestId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { headers: { Authorization: `Bearer ${getToken() ?? ""}` } },
  );
  if (!res.ok) throw new Error(`فشل تنزيل المرفق (HTTP ${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
