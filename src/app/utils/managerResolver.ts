import { departmentsStore } from "@/app/store/departmentsStore";
import { managersStore } from "@/app/store/managersStore";

export function findDepartmentByName(departmentName?: string) {
  if (!departmentName) return null;
  return departmentsStore.getByName(departmentName) ?? null;
}

export function findManagerByDepartment(departmentName?: string) {
  const financialNumber = departmentsStore.getManagerFinancialNumber(departmentName);
  if (!financialNumber) return null;
  return managersStore.getByFinancialNumber(financialNumber) ?? null;
}

export function getManagerFinancialNumberByDepartment(departmentName?: string) {
  return departmentsStore.getManagerFinancialNumber(departmentName);
}

export function getManagerNameByDepartment(departmentName?: string) {
  return findManagerByDepartment(departmentName)?.name ?? "غير محدد";
}
