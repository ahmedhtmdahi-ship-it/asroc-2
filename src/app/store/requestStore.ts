import {
  createRequestApi,
  listRequestsApi,
  patchRequestApi,
  transitionRequestApi,
} from "@/app/lib/requestsApi";
import type { MedicalRequest } from "@/app/types/request";
import type { RequestStatus } from "@/app/types/workflow";

/**
 * تخزين طلبات مؤقت في الذاكرة ومزامنة البيانات من/إلى الباك.
 */
class RequestStore {
  private requests: MedicalRequest[] = [];

  private setRequests(requests: MedicalRequest[]) {
    this.requests = requests;
  }

  private mergeRequest(id: string, partial: Partial<MedicalRequest>) {
    const existing = this.getById(id);
    if (!existing) return;
    Object.assign(existing, partial);
  }

  getAll() {
    return this.requests;
  }

  getById(id: string) {
    return this.requests.find((r) => r.id === id);
  }

  create(request: MedicalRequest) {
    this.requests.push(request);

    const payload = { ...request } as Record<string, unknown>;
    delete payload.status;
    delete payload.createdAt;
    delete payload.createdBy;
    delete payload.approvedAt;
    delete payload.checkedOutAt;
    delete payload.diagnosedAt;
    delete payload.dispensedAt;
    delete payload.returnedAt;
    delete payload.completedAt;
    delete payload.timeline;
    delete payload.attachments;
    delete payload.referralId;
    delete payload.prescriptionId;

    // الـ id بيتبعت للسيرفر فبيتحفظ بنفس القيمة (مفيش تعارض).
    createRequestApi(payload)
      .then((created) => {
        this.mergeRequest(request.id, created);
      })
      .catch((e) => {
        console.warn("[api] create request:", e?.message);
        this.requests = this.requests.filter((r) => r.id !== request.id);
        window.alert("حدث خطأ أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.");
      });

    return request;
  }

  updateStatus(id: string, status: RequestStatus) {
    const request = this.getById(id);
    if (!request) return null;

    const oldStatus = request.status;
    request.status = status;

    transitionRequestApi(id, status)
      .then((updated) => {
        this.mergeRequest(id, updated);
      })
      .catch((e) => {
        console.warn("[api] transition:", e?.message);
        const req = this.getById(id);
        if (req) {
          req.status = oldStatus;
          window.alert("حدث خطأ أثناء تغيير الحالة. تمت استعادة الحالة السابقة.");
          window.location.reload(); // Simple way to force UI refresh for vanilla stores
        }
      });

    return request;
  }

  updateFields(id: string, fields: Partial<MedicalRequest>) {
    const request = this.getById(id);
    if (!request) return null;

    const oldFields: Partial<MedicalRequest> = {};
    for (const key in fields) {
      oldFields[key as keyof MedicalRequest] = request[key as keyof MedicalRequest] as any;
    }

    Object.assign(request, fields);

    patchRequestApi(id, fields)
      .then((updated) => {
        this.mergeRequest(id, updated);
      })
      .catch((e) => {
        console.warn("[api] update fields:", e?.message);
        const req = this.getById(id);
        if (req) {
          Object.assign(req, oldFields);
          window.alert("حدث خطأ أثناء التحديث. تمت استعادة البيانات القديمة.");
          window.location.reload();
        }
      });

    return request;
  }

  // ملاحظة: الاسم متساب زي ما هو مؤقتًا — المصدر بقى الـ API مش Supabase.
  async syncFromApi(): Promise<void> {
    try {
      const data = await listRequestsApi();
      this.setRequests(data);
    } catch {
      // السيرفر غير متاح — نترك البيانات الحالية في الذاكرة.
    }
  }

  clear() {
    this.requests = [];
  }
}

export const requestStore = new RequestStore();
