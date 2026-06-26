import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MedicalRequest, RequestType } from "@/app/types/request";
import type { RequestStatus } from "@/app/types/workflow";
import { apiClient } from "@/app/services/apiClient";
import { useAuth } from "@/app/features/auth/AuthContext";
import { requestStore } from "../store/requestStore";
import { workflowStore } from "../store/workflowStore";

// ── API → MedicalRequest mapper ────────────────────────────────────────────

function apiToMedicalRequest(r: any): MedicalRequest {
  const emp  = r.employee  ?? {};
  const dept = r.department ?? {};
  return {
    id:               String(r.id),
    employeeId:       String(emp.id ?? ""),
    employeeName:     r.employee_name  ?? emp.name  ?? "",
    financialNumber:  r.financial_number ?? emp.financial_number ?? "",
    department:       r.department_name ?? dept.name ?? "",
    reason:           r.notes ?? "",
    status:           r.status as RequestStatus,
    createdAt:        r.created_at ?? new Date().toISOString(),
    requestType:      (r.type ?? "normal") as RequestType,
    notes:            r.notes,
    jobTitle:         r.job_title ?? emp.job_title,
    approvedAt:       r.approved_at,
    checkedOutAt:     r.checked_out_at,
    returnedAt:       r.returned_at,
    managerDecisionReason: r.rejection_reason,
    doctorName:            r.diagnosis?.doctor?.name ?? r.doctor_name,
    doctorDiagnosis:       r.diagnosis?.diagnosis_text,
  };
}

function prescriptionToMedicalRequest(p: any): MedicalRequest {
  return {
    id:              String(p.checkup_request_id ?? p.id),
    employeeId:      "",
    employeeName:    p.employee_name ?? "",
    financialNumber: p.financial_number ?? "",
    department:      p.department_name ?? "",
    reason:          p.notes ?? "",
    status:          (p.status ?? "prescribed") as RequestStatus,
    createdAt:       p.checkup_created_at ?? p.created_at ?? new Date().toISOString(),
    requestType:     (p.type ?? "normal") as RequestType,
    notes:           p.notes,
    jobTitle:        p.job_title,
    prescriptionId:  String(p.id),
  };
}

function extractItems(res: any): any[] {
  if (Array.isArray(res))       return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

// ── Context interface ───────────────────────────────────────────────────────

interface WorkflowContextValue {
  requests:    MedicalRequest[];
  isLoading:   boolean;
  refreshRequests: () => void;
  createRequest:   (request: MedicalRequest) => MedicalRequest;
  moveRequest:     (requestId: string, nextStatus: RequestStatus, note?: string) => MedicalRequest | null;
  approveRequest:  (requestId: string, note?: string) => MedicalRequest | null;
  rejectRequest:   (requestId: string, note?: string) => MedicalRequest | null;
  postponeRequest: (requestId: string, note?: string) => MedicalRequest | null;
  cancelRequest:   (requestId: string, note?: string) => MedicalRequest | null;
  checkOutRequest: (requestId: string, note?: string) => MedicalRequest | null;
  startDiagnosis:  (requestId: string, note?: string) => MedicalRequest | null;
  prescribeRequest:(requestId: string, note?: string) => MedicalRequest | null;
  dispenseRequest: (requestId: string, note?: string) => MedicalRequest | null;
  checkInRequest:  (requestId: string, note?: string) => MedicalRequest | null;
  completeRequest: (requestId: string, note?: string) => MedicalRequest | null;
  approveMonthlyTreatment:       (requestId: string, note?: string) => MedicalRequest | null;
  rejectMonthlyTreatment:        (requestId: string, note?: string) => MedicalRequest | null;
  modifyMonthlyTreatment:        (requestId: string, note?: string) => MedicalRequest | null;
  sendMonthlyTreatmentToPharmacy:(requestId: string, note?: string) => MedicalRequest | null;
  dispenseMonthlyTreatment:      (requestId: string, note?: string) => MedicalRequest | null;
  completeMonthlyTreatment:      (requestId: string, note?: string) => MedicalRequest | null;
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────────────────────

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { user, isApiConnected } = useAuth();

  const [requests,  setRequests]  = useState<MedicalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiReady,  setApiReady]  = useState(false);

  // ── Fetch from real API ──────────────────────────────────────────────────
  const fetchFromApi = useCallback(async () => {
    if (!user || !isApiConnected) return false;
    setIsLoading(true);

    try {
      const role = user.role;
      let items: any[] = [];

      if (role === "employee" || role === "retired_employee") {
        const res = await apiClient.get("/employee/requests?per_page=50");
        items = extractItems(res);
      } else if (role === "manager" || role === "office_manager") {
        const [pending, all] = await Promise.all([
          apiClient.get("/manager/requests?per_page=50"),
          apiClient.get("/manager/requests/all?per_page=50"),
        ]);
        const seen = new Set<string>();
        [...extractItems(pending), ...extractItems(all)].forEach((r) => {
          if (!seen.has(String(r.id))) { seen.add(String(r.id)); items.push(r); }
        });
      } else if (role === "security") {
        const [approved, outside] = await Promise.all([
          apiClient.get("/security/approved-requests?per_page=50"),
          apiClient.get("/security/outside-now?per_page=50"),
        ]);
        const seen = new Set<string>();
        [...extractItems(approved), ...extractItems(outside)].forEach((r) => {
          if (!seen.has(String(r.id))) { seen.add(String(r.id)); items.push(r); }
        });
      } else if (role === "doctor") {
        const res = await apiClient.get("/doctor/queue?per_page=50");
        items = extractItems(res);
      } else if (role === "pharmacy" || role === "internal_pharmacy") {
        const res = await apiClient.get("/internal-pharmacy/prescriptions?per_page=50");
        const prescriptions = extractItems(res);
        setRequests(prescriptions.map(prescriptionToMedicalRequest));
        setApiReady(true);
        return true;
      } else if (
        role === "medical_admin" || role === "pension_admin" ||
        role === "super_admin"   || role === "system_admin"  || role === "top_management"
      ) {
        const res = await apiClient.get("/medical-admin/requests?per_page=100");
        items = extractItems(res);
      }

      setRequests(items.map(apiToMedicalRequest));
      setApiReady(true);
      return true;
    } catch {
      // API unavailable — fall through to mock
    } finally {
      setIsLoading(false);
    }
    return false;
  }, [user?.role, isApiConnected]);

  // ── Load on mount / role change ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await fetchFromApi();
      if (!cancelled && !ok) {
        setRequests([...requestStore.getAll()]);
      }
    })();

    return () => { cancelled = true; };
  }, [fetchFromApi]);

  const refreshRequests = useCallback(() => {
    if (apiReady) {
      fetchFromApi();
    } else {
      setRequests([...requestStore.getAll()]);
    }
  }, [apiReady, fetchFromApi]);

  // ── createRequest ────────────────────────────────────────────────────────
  const createRequest = useCallback((request: MedicalRequest): MedicalRequest => {
    const type  = request.requestType ?? "normal";
    const notes = request.notes ?? request.reason ?? "";

    if (isApiConnected) {
      apiClient.post("/employee/requests", { type, notes })
        .then(() => fetchFromApi())
        .catch(() => {});
    }

    // Optimistic local update / mock fallback
    const created = requestStore.create(request);
    setRequests((prev) => [...prev, created]);
    return created;
  }, [isApiConnected, fetchFromApi]);

  // ── moveRequest ──────────────────────────────────────────────────────────
  const moveRequest = useCallback((
    requestId: string,
    nextStatus: RequestStatus,
    note?: string,
  ): MedicalRequest | null => {
    if (!user) return null;

    // Optimistic local update
    const updated = workflowStore.moveStatus(
      { requestId, userId: user.id, userName: user.name, role: user.role, note },
      nextStatus,
    );

    if (isApiConnected) {
      const id = requestId;

      const apiCall = (): Promise<unknown> => {
        switch (nextStatus) {
          case "approved":
            return apiClient.post(`/manager/requests/${id}/approve`);
          case "rejected":
            return apiClient.post(`/manager/requests/${id}/reject`, {
              rejection_reason: note ?? "مرفوض",
            });
          case "postponed": {
            // note is expected to be ISO date string for postponed_until
            const parts = (note ?? "").split("|");
            return apiClient.post(`/manager/requests/${id}/postpone`, {
              postponed_until: parts[0] || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
              notes: parts[1] ?? undefined,
            });
          }
          case "cancelled":
            return apiClient.delete(`/employee/requests/${id}/cancel`);
          case "checked_out":
            return apiClient.post(`/security/requests/${id}/checkout`);
          case "returned":
            return apiClient.post(`/security/requests/${id}/return`);
          case "dispensed": {
            const req = requests.find((r) => r.id === requestId);
            const prescId = req?.prescriptionId ?? id;
            return apiClient.post(`/internal-pharmacy/prescriptions/${prescId}/dispense`);
          }
          default:
            return Promise.resolve();
        }
      };

      apiCall()
        .then(() => fetchFromApi())
        .catch(() => fetchFromApi());
    } else {
      setRequests([...requestStore.getAll()]);
    }

    return updated;
  }, [user, isApiConnected, requests, fetchFromApi]);

  // ── Value ────────────────────────────────────────────────────────────────
  const value = useMemo<WorkflowContextValue>(() => ({
    requests,
    isLoading,
    refreshRequests,
    createRequest,
    moveRequest,
    approveRequest:  (id, note) => moveRequest(id, "approved",  note),
    rejectRequest:   (id, note) => moveRequest(id, "rejected",  note),
    postponeRequest: (id, note) => moveRequest(id, "postponed", note),
    cancelRequest:   (id, note) => moveRequest(id, "cancelled", note),
    checkOutRequest: (id, note) => moveRequest(id, "checked_out",   note),
    startDiagnosis:  (id, note) => moveRequest(id, "in_diagnosis",  note),
    prescribeRequest:(id, note) => moveRequest(id, "prescribed",    note),
    dispenseRequest: (id, note) => moveRequest(id, "dispensed",     note),
    checkInRequest:  (id, note) => moveRequest(id, "returned",      note),
    completeRequest: (id, note) => moveRequest(id, "completed",     note),
    approveMonthlyTreatment:        (id, note) => moveRequest(id, "monthly_approved",      note),
    rejectMonthlyTreatment:         (id, note) => moveRequest(id, "monthly_rejected",       note),
    modifyMonthlyTreatment:         (id, note) => moveRequest(id, "monthly_modified",       note),
    sendMonthlyTreatmentToPharmacy: (id, note) => moveRequest(id, "monthly_ready_pharmacy", note),
    dispenseMonthlyTreatment:       (id, note) => moveRequest(id, "monthly_dispensed",      note),
    completeMonthlyTreatment:       (id, note) => moveRequest(id, "monthly_completed",      note),
  }), [requests, isLoading, refreshRequests, createRequest, moveRequest]);

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
