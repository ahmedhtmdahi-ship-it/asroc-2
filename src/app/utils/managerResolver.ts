import { mockDepartments } from "@/app/data/mockDepartments";
import { mockManagers } from "@/app/data/mockManagers";

export function normalizeArabicText(value?: string) {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export function findDepartmentByName(departmentName?: string) {
  if (!departmentName) return null;

  const normalizedDepartmentName = normalizeArabicText(departmentName);

  return (
    mockDepartments.find((department) => {
      return normalizeArabicText(department.name) === normalizedDepartmentName;
    }) || null
  );
}

export function findManagerByDepartment(departmentName?: string) {
  const department = findDepartmentByName(departmentName);

  if (!department?.managerFinancialNumber) {
    return null;
  }

  return (
    mockManagers.find((manager) => {
      return manager.financialNumber === department.managerFinancialNumber;
    }) || null
  );
}

export function getManagerFinancialNumberByDepartment(departmentName?: string) {
  const manager = findManagerByDepartment(departmentName);

  return manager?.financialNumber || undefined;
}

export function getManagerNameByDepartment(departmentName?: string) {
  const manager = findManagerByDepartment(departmentName);

  return manager?.name || "غير محدد";
}