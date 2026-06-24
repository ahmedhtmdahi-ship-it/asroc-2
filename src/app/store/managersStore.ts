import { supabase } from "@/app/lib/supabaseClient";
import { mockManagers, type ManagerRecord } from "@/app/data/mockManagers";

class ManagersStore {
  private managers: ManagerRecord[] = [...mockManagers];

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
        jobTitle: (row.job_title as string) ?? undefined,
        department: (row.department as string) ?? "",
        nationalId: (row.national_id as string) ?? undefined,
        phone: (row.phone as string) ?? undefined,
        workType: (row.work_type as string) ?? undefined,
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
