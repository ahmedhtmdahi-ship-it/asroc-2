import { z } from "zod";

import { REQUEST_STATUSES } from "./requests.workflow.js";

export const createRequestSchema = z.object({
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
export type TransitionInput = z.infer<typeof transitionSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
