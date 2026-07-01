import { listUsersApi } from "@/app/lib/dataApi";
import { mockDepartments } from "@/app/data/mockDepartments";

export interface Department {
  id: string;
  name: string;
  managerFinancialNumber?: string;
  managerName?: string;
}

class DepartmentsStore {
  private departments: Department[] = mockDepartments.map((d) => ({
    id: d.id,
    name: d.name,
    managerFinancialNumber: (d as { managerFinancialNumber?: string }).managerFinancialNumber,
  }));

  getAll(): Department[] {
    return this.departments;
  }

  getByName(name: string): Department | undefined {
    const normalized = normalizeArabic(name);
    return this.departments.find((d) => normalizeArabic(d.name) === normalized);
  }

  getManagerFinancialNumber(departmentName?: string): string | undefined {
    if (!departmentName) return undefined;
    return this.getByName(departmentName)?.managerFinancialNumber;
  }

  // ملاحظة: الاسم متساب زي ما هو مؤقتًا — المصدر بقى الـ API مش Supabase.
  async syncFromSupabase(): Promise<void> {
    try {
      // كل المديرين — حقل القسم بتاعهم هو القسم اللي بيديروه
      const data = (await listUsersApi(["manager", "office_manager"])).filter(
        (u) => u.isActive,
      );

      if (!data || data.length === 0) return;

      // بناء خريطة قسم → مدير من بيانات السيرفر
      const managerMap = new Map<string, { financialNumber: string; name: string }>();
      for (const row of data) {
        if (row.department) {
          managerMap.set(normalizeArabic(row.department), {
            financialNumber: row.financialNumber ?? "",
            name: row.name,
          });
        }
      }

      // Update manager assignments — keep existing department list intact
      this.departments = this.departments.map((dept) => {
        const mgr = managerMap.get(normalizeArabic(dept.name));
        return mgr
          ? { ...dept, managerFinancialNumber: mgr.financialNumber, managerName: mgr.name }
          : dept;
      });

      // Also add any departments that appear in profiles but aren't in the static list
      for (const [normalizedName, mgr] of managerMap) {
        const exists = this.departments.some((d) => normalizeArabic(d.name) === normalizedName);
        if (!exists) {
          this.departments.push({
            id: `DYN-${mgr.financialNumber}`,
            name: mgr.name, // fallback — actual name comes from profiles.department
            managerFinancialNumber: mgr.financialNumber,
            managerName: mgr.name,
          });
        }
      }
    } catch {
      // keep static data as fallback
    }
  }
}

function normalizeArabic(value?: string) {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export const departmentsStore = new DepartmentsStore();
