export type { UserRole, Permission } from "@asroc/shared/roles.js";
import type { UserRole, Permission } from "@asroc/shared/roles.js";

export interface User {
  id: string;
  username: string;
  // ✅ password محذوف — الفرونت ما يحتاجها أبداً
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
  mustChangePassword?: boolean;
}