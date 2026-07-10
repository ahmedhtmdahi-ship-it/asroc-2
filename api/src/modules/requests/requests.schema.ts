import { z } from "zod";

import { REQUEST_STATUSES } from "./requests.workflow.js";

export const createRequestSchema = z.object({
  // الـ id والحالة ووقت الإنشاء يولّدها السيرفر — العميل لا يرسل معرّفات.
  // (العرض المتفائل في الواجهة بيستخدم id مؤقت بيتبدل لما رد السيرفر يوصل.)
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  financialNumber: z.string().min(1),
  department: z.string().min(1),
  reason: z.string().min(1),
  serviceType: z.enum(["checkup", "monthly_treatment"]).optional(),
  requestType: z.enum(["normal", "emergency"]).optional(),
  monthlyTreatmentType: z.enum(["new", "renewal"]).optional(),
  monthlyDoctorId: z.string().optional(),
  monthlyDoctorName: z.string().optional(),
  notes: z.string().optional(),
  symptoms: z.string().optional(),
  jobTitle: z.string().optional(),
  workType: z.string().optional(),
  nationalId: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.string().optional(),
  managerName: z.string().optional(),
});

const referralDataSchema = z.object({
  specialty: z.string(),
  priority: z.string(),
  facility: z.string(),
  externalDoctor: z.string().optional(),
  reason: z.string(),
  adminNotes: z.string().optional(),
  status: z.enum(["pending_admin", "approved", "rejected"]),
  submittedAt: z.string(),
  reviewedAt: z.string().optional(),
  reviewedBy: z.string().optional(),
});

// تحديث حقول الطلب (تشخيص/روشتة/إحالة/إجازة...).
export const updateRequestSchema = z.object({
  notes: z.string().optional(),
  doctorDiagnosis: z.string().optional(),
  sickLeaveDays: z.number().int().optional(),
  sickLeaveReason: z.string().optional(),
  managerId: z.string().optional(),
  managerName: z.string().optional(),
  managerDecisionReason: z.string().optional(),
  doctorId: z.string().optional(),
  medications: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        duration: z.string(),
        instructions: z.string(),
      }),
    )
    .optional(),
  referralData: referralDataSchema.optional(),
});

export const transitionSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  note: z.string().optional(),
});

export const listQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(REQUEST_STATUSES).optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
