import { supabase } from "@/app/lib/supabaseClient";
import { mockRequests } from "@/app/data/mockRequests";
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

function toDb(r: MedicalRequest): Record<string, unknown> {
  return {
    id: r.id,
    employee_id: r.employeeId,
    employee_name: r.employeeName,
    financial_number: r.financialNumber,
    department: r.department,
    reason: r.reason,
    status: r.status,
    created_at: r.createdAt,
    created_by: r.createdBy ?? null,
    service_type: r.serviceType ?? null,
    request_type: r.requestType ?? null,
    monthly_treatment_type: r.monthlyTreatmentType ?? null,
    monthly_doctor_id: r.monthlyDoctorId ?? null,
    monthly_doctor_name: r.monthlyDoctorName ?? null,
    notes: r.notes ?? null,
    symptoms: r.symptoms ?? null,
    job_title: r.jobTitle ?? null,
    work_type: r.workType ?? null,
    national_id: r.nationalId ?? null,
    phone: r.phone ?? null,
    approved_at: r.approvedAt ?? null,
    checked_out_at: r.checkedOutAt ?? null,
    diagnosed_at: r.diagnosedAt ?? null,
    dispensed_at: r.dispensedAt ?? null,
    returned_at: r.returnedAt ?? null,
    completed_at: r.completedAt ?? null,
    manager_decision_reason: r.managerDecisionReason ?? null,
    doctor_diagnosis: r.doctorDiagnosis ?? null,
    prescription_id: r.prescriptionId ?? null,
    referral_id: r.referralId ?? null,
    manager_id: r.managerId ?? null,
    manager_name: r.managerName ?? null,
    doctor_id: r.doctorId ?? null,
    security_out_user_id: r.securityOutUserId ?? null,
    security_in_user_id: r.securityInUserId ?? null,
    pharmacy_user_id: r.pharmacyUserId ?? null,
  };
}

function fromDb(row: Record<string, unknown>): MedicalRequest {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    employeeName: row.employee_name as string,
    financialNumber: row.financial_number as string,
    department: row.department as string,
    reason: row.reason as string,
    status: row.status as RequestStatus,
    createdAt: row.created_at as string,
    createdBy: (row.created_by as string) ?? undefined,
    serviceType: (row.service_type as MedicalRequest["serviceType"]) ?? undefined,
    requestType: (row.request_type as MedicalRequest["requestType"]) ?? undefined,
    monthlyTreatmentType: (row.monthly_treatment_type as MedicalRequest["monthlyTreatmentType"]) ?? undefined,
    monthlyDoctorId: (row.monthly_doctor_id as string) ?? undefined,
    monthlyDoctorName: (row.monthly_doctor_name as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    symptoms: (row.symptoms as string) ?? undefined,
    jobTitle: (row.job_title as string) ?? undefined,
    workType: (row.work_type as string) ?? undefined,
    nationalId: (row.national_id as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    approvedAt: (row.approved_at as string) ?? undefined,
    checkedOutAt: (row.checked_out_at as string) ?? undefined,
    diagnosedAt: (row.diagnosed_at as string) ?? undefined,
    dispensedAt: (row.dispensed_at as string) ?? undefined,
    returnedAt: (row.returned_at as string) ?? undefined,
    completedAt: (row.completed_at as string) ?? undefined,
    managerDecisionReason: (row.manager_decision_reason as string) ?? undefined,
    doctorDiagnosis: (row.doctor_diagnosis as string) ?? undefined,
    prescriptionId: (row.prescription_id as string) ?? undefined,
    referralId: (row.referral_id as string) ?? undefined,
    managerId: (row.manager_id as string) ?? undefined,
    managerName: (row.manager_name as string) ?? undefined,
    doctorId: (row.doctor_id as string) ?? undefined,
    securityOutUserId: (row.security_out_user_id as string) ?? undefined,
    securityInUserId: (row.security_in_user_id as string) ?? undefined,
    pharmacyUserId: (row.pharmacy_user_id as string) ?? undefined,
  };
}

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

    supabase
      .from("medical_requests")
      .insert(toDb(request))
      .then(({ error }) => {
        if (error) console.warn("[supabase] insert error:", error.message);
      });

    return request;
  }

  updateStatus(id: string, status: RequestStatus) {
    const request = this.getById(id);
    if (!request) return null;

    request.status = status;
    this.persist();

    supabase
      .from("medical_requests")
      .update({ status })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.warn("[supabase] update error:", error.message);
      });

    return request;
  }

  updateFields(id: string, fields: Partial<MedicalRequest>) {
    const request = this.getById(id);
    if (!request) return null;

    Object.assign(request, fields);
    this.persist();

    // Build db-compatible partial update for known scalar fields
    const dbPatch: Record<string, unknown> = {};
    if (fields.doctorDiagnosis !== undefined) dbPatch.doctor_diagnosis = fields.doctorDiagnosis;
    if (fields.notes !== undefined) dbPatch.notes = fields.notes;
    if (fields.sickLeaveDays !== undefined) dbPatch.sick_leave_days = fields.sickLeaveDays;
    if (fields.sickLeaveReason !== undefined) dbPatch.sick_leave_reason = fields.sickLeaveReason;
    if (fields.medications !== undefined) dbPatch.medications = JSON.stringify(fields.medications);
    if (fields.referralData !== undefined) dbPatch.referral_data = JSON.stringify(fields.referralData);
    if (fields.status !== undefined) dbPatch.status = fields.status;

    if (Object.keys(dbPatch).length > 0) {
      supabase
        .from("medical_requests")
        .update(dbPatch)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.warn("[supabase] updateFields error:", error.message);
        });
    }

    return request;
  }

  async syncFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("medical_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return; // network error — keep local data

      this.requests = ((data ?? []) as Record<string, unknown>[]).map(fromDb);
      this.persist();
    } catch {
      // Supabase not available — keep localStorage data
    }
  }

  clear() {
    this.requests = [...mockRequests];
    this.persist();
  }
}

export const requestStore = new RequestStore();
