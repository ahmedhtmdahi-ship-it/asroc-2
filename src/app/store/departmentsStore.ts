import { apiFetch } from "@/app/lib/apiClient";
import { normalizeArabicText } from "@/app/lib/arabic";
import { ReactiveStore } from "./reactiveStore";

export interface Department {
  id: string;
  name: string;
  managerFinancialNumber?: string;
  managerName?: string;
}

interface ApiDepartment {
  id: string;
  name: string;
  managerId: string | null;
  managerFinancialNumber: string | null;
  managerName: string | null;
}

/**
 * الأقسام من GET /departments (جدول departments في الداتابيز).
 *
 * قبل كده كانت القائمة بتتبني من حقل department بتاع المديرين، وبسبب bug
 * (اسم القسم كان بيتسجل باسم المدير) كان إيجاد «المدير المسؤول» بيفشل دايمًا
 * وطلب الكشف العادي مقفول. المصدر الآن جدول حقيقي والاسم اسم القسم فعلًا.
 */
class DepartmentsStore extends ReactiveStore {
  private departments: Department[] = [];

  getAll(): Department[] {
    return this.departments;
  }

  getByName(name: string): Department | undefined {
    const normalized = normalizeArabicText(name);
    return this.departments.find((d) => normalizeArabicText(d.name) === normalized);
  }

  getManagerFinancialNumber(departmentName?: string): string | undefined {
    if (!departmentName) return undefined;
    return this.getByName(departmentName)?.managerFinancialNumber;
  }

  async syncFromApi(): Promise<void> {
    try {
      const data = await apiFetch<ApiDepartment[]>("/departments");
      if (!data || data.length === 0) return;

      this.departments = data.map((d) => ({
        id: d.id,
        name: d.name,
        managerFinancialNumber: d.managerFinancialNumber ?? undefined,
        managerName: d.managerName ?? undefined,
      }));
      this.emit();
    } catch {
      // keep current in-memory data if sync fails
    }
  }
}

export const departmentsStore = new DepartmentsStore();
