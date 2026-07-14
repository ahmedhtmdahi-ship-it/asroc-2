import { z } from "zod";

import {
  isValidPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
} from "@asroc/shared/policy.js";

export const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب").max(100),
  password: z.string().min(1, "كلمة المرور مطلوبة").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

// سياسة الباسورد من packages/shared — نفس القاعدة في إنشاء المستخدم وتغيير الباسورد.
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE)
  .max(200, "كلمة المرور طويلة جدًا")
  .refine(isValidPassword, PASSWORD_POLICY_MESSAGE);

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة").max(200),
  newPassword: newPasswordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
