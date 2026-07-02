// UserRole و Permission انتقلوا لـ packages/shared عشان يبقوا مصدر واحد
// مشترك بين الباك والفرونت بدل التعريف اليدوي المكرر.
export type { UserRole, Permission } from "@asroc/shared/roles.js";
import type { UserRole, Permission } from "@asroc/shared/roles.js";

export interface User {
  id: string;
  username: string;
  password: string;
  financialNumber?: string;
  name: string;
  jobTitle?: string;
  workPlace?: string;
  department?: string;
  nationalId?: string;
  phone?: string;
  workType?: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
}
