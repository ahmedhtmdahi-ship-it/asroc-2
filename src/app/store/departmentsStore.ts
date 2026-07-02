import { lookupUsersApi } from "@/app/lib/dataApi";

export interface Department {
  id: string;
  name: string;
  managerFinancialNumber?: string;
  managerName?: string;
}

class DepartmentsStore {
  private departments: Department[] = [];

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

  async syncFromApi(): Promise<void> {
    try {
      // كل المديرين — حقل القسم بتاعهم هو القسم الذي يديرونه
      const data = (await lookupUsersApi(["manager", "office_manager"])) .filter(
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

      // Also add any departments that appear in profiles but aren't in the current list
      for (const [normalizedName, mgr] of managerMap) {
        const exists = this.departments.some((d) => normalizeArabic(d.name) === normalizedName);
        if (!exists) {
          this.departments.push({
            id: `DYN-${mgr.financialNumber}`,
            name: mgr.name,
            managerFinancialNumber: mgr.financialNumber,
            managerName: mgr.name,
          });
        }
      }
    } catch {
      // keep current in-memory data if sync fails
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
