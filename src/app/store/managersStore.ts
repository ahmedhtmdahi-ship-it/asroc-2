import { listUsersApi } from "@/app/lib/dataApi";
import { mockManagers, type ManagerRecord } from "@/app/data/mockManagers";

class ManagersStore {
  private managers: ManagerRecord[] = [...mockManagers];

  getAll(): ManagerRecord[] {
    return this.managers;
  }

  getByFinancialNumber(financialNumber: string): ManagerRecord | undefined {
    return this.managers.find((m) => m.financialNumber === financialNumber);
  }

  // ملاحظة: الاسم متساب زي ما هو مؤقتًا — المصدر بقى الـ API مش Supabase.
  async syncFromSupabase(): Promise<void> {
    try {
      const data = await listUsersApi(["manager", "office_manager"]);
      if (!data || data.length === 0) return;

      this.managers = data.map((u) => ({
        id: u.id,
        financialNumber: u.financialNumber ?? "",
        name: u.name,
        jobTitle: u.jobTitle ?? undefined,
        department: u.department ?? "",
        nationalId: u.nationalId ?? undefined,
        phone: u.phone ?? undefined,
        workType: u.workType ?? undefined,
        managerType: u.role as "manager" | "office_manager",
        managedDepartments: [u.department ?? ""],
        isActive: u.isActive,
      }));
    } catch {
      // keep mock data as fallback
    }
  }
}

export const managersStore = new ManagersStore();
