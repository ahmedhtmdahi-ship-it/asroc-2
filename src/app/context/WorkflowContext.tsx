import {
  createContext,
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
import { notificationStore } from "../store/notificationStore";
import { workflowStore } from "../store/workflowStore";
import { useAuth } from "@/app/features/auth/AuthContext";

interface WorkflowContextValue {
  requests: MedicalRequest[];
  syncing: boolean;
  refreshRequests: () => void;
  createRequest: (request: MedicalRequest) => MedicalRequest;
  moveRequest: (requestId: string, nextStatus: RequestStatus, note?: string) => MedicalRequest | null;
  approveRequest: (requestId: string, note?: string) => MedicalRequest | null;
  rejectRequest: (requestId: string, note?: string) => MedicalRequest | null;
  postponeRequest: (requestId: string, note?: string) => MedicalRequest | null;
  cancelRequest: (requestId: string, note?: string) => MedicalRequest | null;
  checkOutRequest: (requestId: string, note?: string) => MedicalRequest | null;
  startDiagnosis: (requestId: string, note?: string) => MedicalRequest | null;
  prescribeRequest: (requestId: string, note?: string) => MedicalRequest | null;
  dispenseRequest: (requestId: string, note?: string) => MedicalRequest | null;
  checkInRequest: (requestId: string, note?: string) => MedicalRequest | null;
  completeRequest: (requestId: string, note?: string) => MedicalRequest | null;
  approveMonthlyTreatment: (requestId: string, note?: string) => MedicalRequest | null;
  rejectMonthlyTreatment: (requestId: string, note?: string) => MedicalRequest | null;
  modifyMonthlyTreatment: (requestId: string, note?: string) => MedicalRequest | null;
  sendMonthlyTreatmentToPharmacy: (requestId: string, note?: string) => MedicalRequest | null;
  dispenseMonthlyTreatment: (requestId: string, note?: string) => MedicalRequest | null;
  completeMonthlyTreatment: (requestId: string, note?: string) => MedicalRequest | null;
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(
  undefined
);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [requests, setRequests] = useState<MedicalRequest[]>(
    requestStore.getAll()
  );
  const [syncing, setSyncing] = useState(false);

  const refreshRequests = () => {
    setRequests([...requestStore.getAll()]);
  };

  useEffect(() => {
    if (!user) return;
    setSyncing(true);

    Promise.all([
      requestStore.syncFromApi(),
      managersStore.syncFromApi(),
      departmentsStore.syncFromApi(),
      medicineStore.syncFromApi(),
      profilesStore.syncFromApi(),
      notificationStore.syncFromApi(user.id),
    ])
      .then(() => refreshRequests())
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [user?.id]);

  const createRequest = (request: MedicalRequest) => {
    const created = requestStore.create(request);
    refreshRequests();
    return created;
  };

  const moveRequest = (
    requestId: string,
    nextStatus: RequestStatus,
    note?: string
  ) => {
    if (!user) return null;

    const updated = workflowStore.moveStatus(
      {
        requestId,
        userId: user.id,
        userName: user.name,
        role: user.role,
        note,
      },
      nextStatus
    );

    refreshRequests();
    return updated;
  };

  const value = useMemo<WorkflowContextValue>(
    () => ({
      requests,
      syncing,
      refreshRequests,
      createRequest,

      moveRequest,

      approveRequest: (requestId, note) =>
        moveRequest(requestId, "approved", note),

      rejectRequest: (requestId, note) =>
        moveRequest(requestId, "rejected", note),

      postponeRequest: (requestId, note) =>
        moveRequest(requestId, "postponed", note),

      cancelRequest: (requestId, note) =>
        moveRequest(requestId, "cancelled", note),

      checkOutRequest: (requestId, note) =>
        moveRequest(requestId, "checked_out", note),

      startDiagnosis: (requestId, note) =>
        moveRequest(requestId, "in_diagnosis", note),

      prescribeRequest: (requestId, note) =>
        moveRequest(requestId, "prescribed", note),

      dispenseRequest: (requestId, note) =>
        moveRequest(requestId, "dispensed", note),

      checkInRequest: (requestId, note) =>
        moveRequest(requestId, "returned", note),

      completeRequest: (requestId, note) =>
        moveRequest(requestId, "completed", note),

      approveMonthlyTreatment: (requestId, note) =>
        moveRequest(requestId, "monthly_approved", note),

      rejectMonthlyTreatment: (requestId, note) =>
        moveRequest(requestId, "monthly_rejected", note),

      modifyMonthlyTreatment: (requestId, note) =>
        moveRequest(requestId, "monthly_modified", note),

      sendMonthlyTreatmentToPharmacy: (requestId, note) =>
        moveRequest(requestId, "monthly_ready_pharmacy", note),

      dispenseMonthlyTreatment: (requestId, note) =>
        moveRequest(requestId, "monthly_dispensed", note),

      completeMonthlyTreatment: (requestId, note) =>
        moveRequest(requestId, "monthly_completed", note),
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
