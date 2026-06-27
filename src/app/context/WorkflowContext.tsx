import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MedicalRequest } from "@/app/types/request";
import type { RequestStatus } from "@/app/types/workflow";
import { requestStore } from "../store/requestStore";
import { managersStore } from "../store/managersStore";
import { departmentsStore } from "../store/departmentsStore";
import { medicineStore } from "../store/medicineStore";
import { profilesStore } from "../store/profilesStore";
import { workflowStore } from "../store/workflowStore";
import { useAuth } from "@/app/features/auth/AuthContext";

interface WorkflowContextValue {
  requests: MedicalRequest[];
  syncing: boolean;
  refreshRequests: () => void;
  createRequest: (request: MedicalRequest) => Promise<MedicalRequest | null>;
  moveRequest: (requestId: string, nextStatus: RequestStatus, note?: string) => Promise<MedicalRequest | null>;
  approveRequest: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  rejectRequest: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  postponeRequest: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  cancelRequest: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  checkOutRequest: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  startDiagnosis: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  prescribeRequest: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  dispenseRequest: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  checkInRequest: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  completeRequest: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  approveMonthlyTreatment: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  rejectMonthlyTreatment: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  modifyMonthlyTreatment: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  sendMonthlyTreatmentToPharmacy: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  dispenseMonthlyTreatment: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
  completeMonthlyTreatment: (requestId: string, note?: string) => Promise<MedicalRequest | null>;
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [requests, setRequests] = useState<MedicalRequest[]>(requestStore.getAll());
  const [syncing, setSyncing] = useState(false);

  const refreshRequests = useCallback(() => {
    setRequests([...requestStore.getAll()]);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Dev: lazy-load the medicines seed as a separate chunk (avoids 3.2MB static bundle)
    if (import.meta.env.DEV) {
      medicineStore.loadDevSeed();
      return;
    }

    // cancelled prevents setState on unmount and suppresses React StrictMode double-invoke
    let cancelled = false;
    setSyncing(true);

    const timeoutId = setTimeout(() => {}, 5_000); // kept so cleanup can cancel it
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("sync timeout")), 5_000)
    );

    const syncs = Promise.all([
      managersStore.syncFromSupabase(),
      departmentsStore.syncFromSupabase(),
      medicineStore.syncFromSupabase(),
      profilesStore.syncFromSupabase(),
      requestStore.syncFromSupabase(),
    ]);

    Promise.race([syncs, timeout])
      .catch(() => {}) // timeout or network error — keep local data as fallback
      .finally(() => {
        if (!cancelled) {
          refreshRequests();
          setSyncing(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [user?.id, refreshRequests]);

  const createRequest = useCallback(async (request: MedicalRequest) => {
    const created = await requestStore.create(request);
    refreshRequests();
    return created;
  }, [refreshRequests]);

  const moveRequest = useCallback(async (
    requestId: string,
    nextStatus: RequestStatus,
    note?: string,
  ): Promise<MedicalRequest | null> => {
    if (!user) return null;

    try {
      const updated = await workflowStore.moveStatus(
        {
          requestId,
          userId: user.id,
          userName: user.name,
          role: user.role,
          note,
        },
        nextStatus,
      );
      refreshRequests();
      return updated;
    } catch (err) {
      refreshRequests();
      throw err;
    }
  }, [user, refreshRequests]);

  const value = useMemo<WorkflowContextValue>(
    () => ({
      requests,
      syncing,
      refreshRequests,
      createRequest,
      moveRequest,
      approveRequest:               (id, note) => moveRequest(id, "approved", note),
      rejectRequest:                (id, note) => moveRequest(id, "rejected", note),
      postponeRequest:              (id, note) => moveRequest(id, "postponed", note),
      cancelRequest:                (id, note) => moveRequest(id, "cancelled", note),
      checkOutRequest:              (id, note) => moveRequest(id, "checked_out", note),
      startDiagnosis:               (id, note) => moveRequest(id, "in_diagnosis", note),
      prescribeRequest:             (id, note) => moveRequest(id, "prescribed", note),
      dispenseRequest:              (id, note) => moveRequest(id, "dispensed", note),
      checkInRequest:               (id, note) => moveRequest(id, "returned", note),
      completeRequest:              (id, note) => moveRequest(id, "completed", note),
      approveMonthlyTreatment:      (id, note) => moveRequest(id, "monthly_approved", note),
      rejectMonthlyTreatment:       (id, note) => moveRequest(id, "monthly_rejected", note),
      modifyMonthlyTreatment:       (id, note) => moveRequest(id, "monthly_modified", note),
      sendMonthlyTreatmentToPharmacy:(id, note) => moveRequest(id, "monthly_ready_pharmacy", note),
      dispenseMonthlyTreatment:     (id, note) => moveRequest(id, "monthly_dispensed", note),
      completeMonthlyTreatment:     (id, note) => moveRequest(id, "monthly_completed", note),
    }),
    [requests, syncing, refreshRequests, createRequest, moveRequest],
  );

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error("useWorkflow must be used inside WorkflowProvider");
  return context;
}
