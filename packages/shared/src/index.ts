export * from "./roles.js";
export * from "./workflow.js";
export * from "./policy.js";

import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "8 أحرف على الأقل")
  .regex(/[a-zA-Z]/, "لازم حرف واحد على الأقل")
  .regex(/[0-9]/, "لازم رقم واحد على الأقل");