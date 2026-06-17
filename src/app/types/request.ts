import type { RequestStatus } from "./workflow";

export type ServiceType = "checkup" | "monthly_treatment";

export type RequestType = "normal" | "emergency";

export type MonthlyTreatmentType = "new" | "renewal";

export interface RequestTimelineEvent {
  id: string;
  status: RequestStatus;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  notes?: string;
}

export interface RequestAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface MedicalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  financialNumber: string;
  department: string;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  createdBy?: string;
  serviceType?: ServiceType;
  requestType?: RequestType;
  monthlyTreatmentType?: MonthlyTreatmentType;
  monthlyDoctorId?: string;
  monthlyDoctorName?: string;
  notes?: string;
  symptoms?: string;
  jobTitle?: string;
  workType?: string;
  nationalId?: string;
  phone?: string;
  approvedAt?: string;
  checkedOutAt?: string;
  diagnosedAt?: string;
  dispensedAt?: string;
  returnedAt?: string;
  completedAt?: string;
  managerDecisionReason?: string;
  doctorDiagnosis?: string;
  prescriptionId?: string;
  referralId?: string;
  managerId?: string;
  managerName?: string;
  doctorId?: string;
  securityOutUserId?: string;
  securityInUserId?: string;
  pharmacyUserId?: string;
  timeline?: RequestTimelineEvent[];
  attachments?: RequestAttachment[];
}
