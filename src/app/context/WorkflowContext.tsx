import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MedicalRequest } from "@/app/types/request";
import { canMove, type RequestStatus } from "@/app/types/workflow";
import { requestStore } from "../store/requestStore";
import { useStore } from "../store/reactiveStore";
import { managersStore } from "../store/managersStore";
import { departmentsStore } from "../store/departmentsStore";
import { profilesStore } from "../store/profilesStore";
import { notificationStore } from "../store/notificationStore";
import { useAuth } from "@/app/features/auth/AuthContext";

interface WorkflowContextValue {
  requests: MedicalRequest[];
  syncing: boolean;
  refreshRequests: () => void;
  createRequest: (request: MedicalRequest, attachments?: File[]) => MedicalRequest;
  /**
   * الانتقال الوحيد لكل الحالات — بدل 16 wrapper باسم لكل حالة.
   * أسماء الحالات من RequestStatus المشترك (نفس أسماء السيرفر).
   */
  moveRequest: (requestId: string, nextStatus: RequestStatus, note?: string) => MedicalRequest | null;
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(
  undefined
);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // اشتراك تفاعلي في الـ store — أي تغيير في الطلبات (تحديث متفائل، دمج رد
  // السيرفر، أو rollback) بيعيد الرسم تلقائيًا بدون أي reload يدوي.
  const requests = useStore(requestStore, (s) => s.getAll());
  const [syncing, setSyncing] = useState(false);

  // تحديث يدوي = إعادة سحب من السيرفر (زرار "تحديث"). القراءة نفسها تفاعلية أصلاً.
  const refreshRequests = () => {
    void requestStore.syncFromApi();
  };

  useEffect(() => {
    if (!user) return;
    setSyncing(true);

    // ملحوظة: كتالوج الأدوية (~19 ألف صنف) مش هنا عمدًا — بيتحمّل كسول عند أول
    // صفحة محتاجاه (صيدلية/طبيب/مخزون) عبر medicineStore.ensureLoaded()، فأغلب
    // المستخدمين (موظفين/أمن/مديرين) مش بيسحبوه أصلاً.
    Promise.all([
      requestStore.syncFromApi(),
      managersStore.syncFromApi(),
      departmentsStore.syncFromApi(),
      profilesStore.syncFromApi(),
      notificationStore.syncFromApi(),
    ])
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [user?.id]);

  const createRequest = (request: MedicalRequest, attachments?: File[]) => {
    return requestStore.create(request, attachments);
  };

  // فحص الانتقال هنا UX مبكر فقط — القاعدة الحقيقية والصلاحيات على السيرفر.
  const moveRequest = (
    requestId: string,
    nextStatus: RequestStatus,
    note?: string
  ) => {
    if (!user) return null;

    const request = requestStore.getById(requestId);
    if (!request) throw new Error("Request not found");

    if (!canMove(request.status, nextStatus)) {
      throw new Error(
        `Invalid workflow transition: ${request.status} → ${nextStatus}`
      );
    }

    return requestStore.updateStatus(requestId, nextStatus, note);
  };

  const value = useMemo<WorkflowContextValue>(
    () => ({
      requests,
      syncing,
      refreshRequests,
      createRequest,
      moveRequest,
    }),
    [requests, syncing, user]
  );

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);

  if (!context) {
    throw new Error("useWorkflow must be used inside WorkflowProvider");
  }

  return context;
}
