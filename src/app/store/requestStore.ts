import { toast } from "sonner";

import {
  createRequestApi,
  listRequestsApi,
  patchRequestApi,
  transitionRequestApi,
  uploadRequestAttachmentApi,
} from "@/app/lib/requestsApi";
import type { MedicalRequest } from "@/app/types/request";
import type { RequestStatus } from "@/app/types/workflow";
import { ReactiveStore } from "./reactiveStore";

/**
 * تخزين طلبات مؤقت في الذاكرة ومزامنة البيانات من/إلى الباك.
 *
 * كل تعديل على الحالة بيستبدل مرجع المصفوفة (immutable) وبينادي emit()، فالواجهة
 * بتتحدّث تلقائيًا عن طريق useStore — من غير أي window.location.reload().
 *
 * لكل تعديل نسختان:
 *  - نسخة متزامنة (fire-and-forget): تحديث متفائل + تنبيه عند الفشل (والـ rollback
 *    بيعمل re-render لوحده) — للنداءات البسيطة.
 *  - نسخة async (transitionAsync/patchAsync): بترجّع Promise عشان الصفحات تعمل await
 *    وتسلسل النداءات المترابطة (زي الكشف ثم الروشتة) وتتعامل مع الخطأ بنفسها.
 */
class RequestStore extends ReactiveStore {
  private requests: MedicalRequest[] = [];

  private setRequests(requests: MedicalRequest[]) {
    this.requests = requests;
    this.emit();
  }

  /** تطبيق تعديل جزئي على طلب بشكل immutable مع إشعار الواجهة. */
  private applyLocal(id: string, partial: Partial<MedicalRequest>) {
    let updated: MedicalRequest | undefined;
    this.requests = this.requests.map((r) => {
      if (r.id !== id) return r;
      updated = { ...r, ...partial };
      return updated;
    });
    if (updated) this.emit();
    return updated;
  }

  private mergeRequest(id: string, partial: Partial<MedicalRequest>) {
    return this.applyLocal(id, partial);
  }

  getAll() {
    return this.requests;
  }

  getById(id: string) {
    return this.requests.find((r) => r.id === id);
  }

  create(request: MedicalRequest, attachments: File[] = []) {
    // الـ id الحقيقي بيولّده السيرفر (uuid) — هنا id مؤقت للعرض المتفائل فقط،
    // بيتبدل بالطلب الكامل الراجع من السيرفر (أو بيتشال لو الحفظ فشل).
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: MedicalRequest = { ...request, id: tempId };

    this.requests = [...this.requests, optimistic];
    this.emit();

    const payload = {
   employeeId: request.employeeId,
   employeeName: request.employeeName,
   financialNumber: request.financialNumber,
   department: request.department,
   reason: request.reason,
   serviceType: request.serviceType,
   requestType: request.requestType,
   monthlyTreatmentType: request.monthlyTreatmentType,
   monthlyDoctorId: request.monthlyDoctorId,
   monthlyDoctorName: request.monthlyDoctorName,
   notes: request.notes,
   symptoms: request.symptoms,
   jobTitle: request.jobTitle,
   workType: request.workType,
   nationalId: request.nationalId,
   phone: request.phone,
   managerId: request.managerId,
   managerName: request.managerName,
   };
    createRequestApi(payload)
      .then(async (created) => {
        // استبدال كامل (مش merge) عشان الـ id المؤقت يتبدل بالحقيقي.
        this.requests = this.requests.map((r) => (r.id === tempId ? created : r));
        this.emit();

        // رفع المرفقات بعد ما الـ id الحقيقي يوصل — فشل مرفق لا يُفشل الطلب.
        if (attachments.length > 0) {
          const failed: string[] = [];
          for (const file of attachments) {
            try {
              const saved = await uploadRequestAttachmentApi(created.id, file);
              this.applyLocal(created.id, {
                attachments: [...(this.getById(created.id)?.attachments ?? []), saved],
              } as Partial<MedicalRequest>);
            } catch {
              failed.push(file.name);
            }
          }
          if (failed.length > 0) {
            toast.warning(
              `الطلب اتسجل، لكن فشل رفع: ${failed.join("، ")} — أعد المحاولة من صفحة التفاصيل.`,
            );
          }
        }
      })
      .catch((e) => {
        this.requests = this.requests.filter((r) => r.id !== tempId);
        this.emit();
        toast.error(
          e instanceof Error && e.message
            ? `تعذر حفظ الطلب: ${e.message}`
            : "حدث خطأ أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.",
        );
      });

    return optimistic;
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
    this.applyLocal(id, { status }); // تحديث متفائل

    try {
      const updated = await transitionRequestApi(id, status, note);
      this.mergeRequest(id, updated);
      return this.getById(id) ?? null;
    } catch (e) {
      this.applyLocal(id, { status: oldStatus }); // rollback → re-render تلقائي
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

    this.applyLocal(id, fields); // تحديث متفائل

    try {
      const updated = await patchRequestApi(id, fields);
      this.mergeRequest(id, updated);
      return this.getById(id) ?? null;
    } catch (e) {
      this.applyLocal(id, oldFields); // rollback → re-render تلقائي
      throw e;
    }
  }

  updateStatus(id: string, status: RequestStatus, note?: string) {
    const request = this.getById(id);
    if (!request) return null;

    this.transitionAsync(id, status, note).catch(() => {
      toast.error("حدث خطأ أثناء تغيير الحالة. تمت استعادة الحالة السابقة.");
    });

    return request;
  }

  updateFields(id: string, fields: Partial<MedicalRequest>) {
    const request = this.getById(id);
    if (!request) return null;

    this.patchAsync(id, fields).catch(() => {
      toast.error("حدث خطأ أثناء التحديث. تمت استعادة البيانات القديمة.");
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
    this.emit();
  }
}

export const requestStore = new RequestStore();
