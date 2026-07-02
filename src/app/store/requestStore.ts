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
 *
 * لكل تعديل نسختان:
 *  - نسخة متزامنة (fire-and-forget): تحديث متفائل + تنبيه/إعادة تحميل عند الفشل — للنداءات البسيطة.
 *  - نسخة async (transitionAsync/patchAsync): بترجّع Promise عشان الصفحات تعمل await وتسلسل
 *    النداءات المترابطة (زي الكشف ثم الروشتة) وتتعامل مع الخطأ بنفسها من غير reload.
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

  /** نسخة async: تحديث الحالة مع await + رفض عند الفشل (بدون reload). */
  async transitionAsync(
    id: string,
    status: RequestStatus,
    note?: string,
  ): Promise<MedicalRequest | null> {
    const request = this.getById(id);
    if (!request) return null;

    const oldStatus = request.status;
    request.status = status;

    try {
      const updated = await transitionRequestApi(id, status, note);
      this.mergeRequest(id, updated);
      return this.getById(id) ?? null;
    } catch (e) {
      const req = this.getById(id);
      if (req) req.status = oldStatus;
      throw e;
    }
  }

  /** نسخة async: تحديث حقول مع await + رفض عند الفشل (بدون reload). */
  async patchAsync(
    id: string,
    fields: Partial<MedicalRequest>,
  ): Promise<MedicalRequest | null> {
    const request = this.getById(id);
    if (!request) return null;

    const oldFields: Partial<MedicalRequest> = {};
    for (const key in fields) {
      oldFields[key as keyof MedicalRequest] = request[
        key as keyof MedicalRequest
      ] as never;
    }

    Object.assign(request, fields);

    try {
      const updated = await patchRequestApi(id, fields);
      this.mergeRequest(id, updated);
      return this.getById(id) ?? null;
    } catch (e) {
      const req = this.getById(id);
      if (req) Object.assign(req, oldFields);
      throw e;
    }
  }

  updateStatus(id: string, status: RequestStatus, note?: string) {
    const request = this.getById(id);
    if (!request) return null;

    this.transitionAsync(id, status, note).catch((e) => {
      console.warn("[api] transition:", e?.message);
      window.alert("حدث خطأ أثناء تغيير الحالة. تمت استعادة الحالة السابقة.");
      window.location.reload(); // إعادة تحميل بسيطة لتحديث الواجهة المتزامنة
    });

    return request;
  }

  updateFields(id: string, fields: Partial<MedicalRequest>) {
    const request = this.getById(id);
    if (!request) return null;

    this.patchAsync(id, fields).catch((e) => {
      console.warn("[api] update fields:", e?.message);
      window.alert("حدث خطأ أثناء التحديث. تمت استعادة البيانات القديمة.");
      window.location.reload();
    });

    return request;
  }

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
