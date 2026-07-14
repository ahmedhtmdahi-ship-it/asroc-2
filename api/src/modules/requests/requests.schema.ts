import { z } from "zod";

import { REQUEST_STATUSES } from "./requests.workflow.js";

// حدود طول قصوى لكل نص — تمنع تخزين حمولات ضخمة (DoS / تضخّم قاعدة البيانات).
const short = (max = 200) => z.string().max(max);
const idStr = z.string().min(1).max(100);
const text = z.string().max(5000);
const longText = z.string().max(2000);

export const createRequestSchema = z.object({
  // الـ id والحالة ووقت الإنشاء يولّدها السيرفر — العميل لا يرسل معرّفات.
  // (العرض المتفائل في الواجهة بيستخدم id مؤقت بيتبدل لما رد السيرفر يوصل.)
  employeeId: idStr,
  employeeName: z.string().min(1).max(200),
  financialNumber: z.string().min(1).max(50),
  department: z.string().min(1).max(200),
  reason: z.string().min(1).max(2000),
  serviceType: z.enum(["checkup", "monthly_treatment"]).optional(),
  requestType: z.enum(["normal", "emergency"]).optional(),
  monthlyTreatmentType: z.enum(["new", "renewal"]).optional(),
  monthlyDoctorId: short(100).optional(),
  monthlyDoctorName: short(200).optional(),
  notes: text.optional(),
  symptoms: text.optional(),
  jobTitle: short(200).optional(),
  workType: short(100).optional(),
  nationalId: short(50).optional(),
  phone: short(50).optional(),
  managerId: short(100).optional(),
  managerName: short(200).optional(),
});

const referralDataSchema = z.object({
  specialty: short(300),
  priority: short(50),
  facility: short(300),
  externalDoctor: short(200).optional(),
  reason: longText,
  adminNotes: longText.optional(),
  status: z.enum(["pending_admin", "approved", "rejected"]),
  submittedAt: short(40),
  reviewedAt: short(40).optional(),
  reviewedBy: short(200).optional(),
});

// تحديث حقول الطلب (تشخيص/روشتة/إحالة/إجازة...).
export const updateRequestSchema = z.object({
  notes: text.optional(),
  doctorDiagnosis: text.optional(),
  sickLeaveDays: z.number().int().min(0).max(365).optional(),
  sickLeaveReason: longText.optional(),
  managerId: short(100).optional(),
  managerName: short(200).optional(),
  managerDecisionReason: longText.optional(),
  doctorId: short(100).optional(),
  medications: z
    .array(
      z.object({
        name: short(300),
        dosage: short(100),
        duration: short(100),
        instructions: short(1000),
      }),
    )
    .max(100)
    .optional(),
  referralData: referralDataSchema.optional(),
});

export const transitionSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  note: longText.optional(),
});

export const listQuerySchema = z.object({
  employeeId: short(100).optional(),
  status: z.enum(REQUEST_STATUSES).optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
