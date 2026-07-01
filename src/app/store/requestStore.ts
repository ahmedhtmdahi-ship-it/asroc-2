import { mockRequests } from "@/app/data/mockRequests";
import {
  createRequestApi,
  listRequestsApi,
  patchRequestApi,
  transitionRequestApi,
} from "@/app/lib/requestsApi";
import type { MedicalRequest } from "@/app/types/request";
import type { RequestStatus } from "@/app/types/workflow";

const STORAGE_KEY = "asorc_requests";

function loadFromLocalStorage(): MedicalRequest[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * تحديث محلي متفائل + مزامنة خلفية مع الـ API (سيرفر الشركة).
 * الواجهة متزامنة زي ما كانت — الصفحات ما اتغيرتش.
 */
class RequestStore {
  private requests: MedicalRequest[] = loadFromLocalStorage();

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.requests));
  }

  getAll() {
    return this.requests;
  }

  getById(id: string) {
    return this.requests.find((r) => r.id === id);
  }

  create(request: MedicalRequest) {
    this.requests.push(request);
    this.persist();

    // الـ id بيتبعت للسيرفر فبيتحفظ بنفس القيمة (مفيش تعارض).
    createRequestApi(request).catch((e) =>
      console.warn("[api] create request:", e?.message),
    );

    return request;
  }

  updateStatus(id: string, status: RequestStatus) {
    const request = this.getById(id);
    if (!request) return null;

    request.status = status;
    this.persist();

    transitionRequestApi(id, status).catch((e) =>
      console.warn("[api] transition:", e?.message),
    );

    return request;
  }

  updateFields(id: string, fields: Partial<MedicalRequest>) {
    const request = this.getById(id);
    if (!request) return null;

    Object.assign(request, fields);
    this.persist();

    patchRequestApi(id, fields).catch((e) =>
      console.warn("[api] update fields:", e?.message),
    );

    return request;
  }

  // ملاحظة: الاسم متساب زي ما هو مؤقتًا — المصدر بقى الـ API مش Supabase.
  async syncFromSupabase(): Promise<void> {
    try {
      const data = await listRequestsApi();
      this.requests = data;
      this.persist();
    } catch {
      // السيرفر غير متاح — نسيب الداتا المحلية
    }
  }

  clear() {
    this.requests = [...mockRequests];
    this.persist();
  }
}

export const requestStore = new RequestStore();
