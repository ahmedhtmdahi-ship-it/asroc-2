import { z } from "zod";

import {
  isValidPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
} from "@asroc/shared/policy.js";

export const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// سياسة الباسورد من packages/shared — نفس القاعدة في إنشاء المستخدم وتغيير الباسورد.
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE)
  .refine(isValidPassword, PASSWORD_POLICY_MESSAGE);

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: newPasswordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
