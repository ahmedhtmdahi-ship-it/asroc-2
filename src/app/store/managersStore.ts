import { supabase } from "@/app/lib/supabaseClient";
import { mockManagers, type ManagerRecord } from "@/app/data/mockManagers";
import { DEV_TEST_USERS } from "@/app/data/testUsers";
import { mockUsers } from "@/app/data/mockUsers";

const devManagerOverrides: ManagerRecord[] = import.meta.env.DEV
  ? [...DEV_TEST_USERS, ...mockUsers]
      .filter((u) => u.role === "manager" || u.role === "office_manager")
      .map((u) => ({
        id: u.id,
        financialNumber: u.financialNumber ?? u.id,
        name: u.name,
        jobTitle: u.jobTitle ?? '',
        department: u.department ?? u.workPlace ?? "",
        nationalId: u.nationalId,
        phone: u.phone,
        workType: u.workType,
        managerType: u.role as "manager" | "office_manager",
        managedDepartments: [u.department ?? u.workPlace ?? ""],
        isActive: u.isActive,
      }))
  : [];

class ManagersStore {
  private managers: ManagerRecord[] = [...mockManagers, ...devManagerOverrides];

  getAll(): ManagerRecord[] {
    return this.managers;
  }

  getByFinancialNumber(financialNumber: string): ManagerRecord | undefined {
    return this.managers.find((m) => m.financialNumber === financialNumber);
  }

  async syncFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, financial_number, name, job_title, department, role, national_id, phone, work_type, is_active")
        .in("role", ["manager", "office_manager"]);

      if (error || !data || data.length === 0) return;

      this.managers = (data as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        financialNumber: row.financial_number as string,
        name: row.name as string,
                jobTitle: (row.job_title as string) ?? '',
        department: (row.department as string) ?? "",
               nationalId: (row.national_id as string) ?? '',
        phone: (row.phone as string) ?? '',
        workType: (row.work_type as string) ?? '',
        managerType: row.role as "manager" | "office_manager",
        managedDepartments: [(row.department as string) ?? ""],
        isActive: (row.is_active as boolean) ?? true,
      }));
    } catch {
      // keep mock data as fallback
    }
  }
}

export const managersStore = new ManagersStore();
