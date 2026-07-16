export type EmployeeStatus = "active" | "retired" | "on_leave" | "suspended";

export interface Employee {
  id: string;
  financialNumber: string;
  nationalId?: string;
  name: string;
  jobTitle: string;
  department?: string;
  workPlace?: string;
  workType?: string;
  phone?: string;
  status: EmployeeStatus;
  managerId?: string;
  officeManagerId?: string;
}
