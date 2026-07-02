import { lookupUsersApi } from "@/app/lib/dataApi";

interface ManagerRecord {
  id: string;
  financialNumber: string;
  nationalId?: string;
  name: string;
  jobTitle: string;
  department?: string;
  workPlace?: string;
  workType?: string;
  phone?: string;
  status: "active" | "retired" | "on_leave" | "suspended";
  managerType: "manager" | "office_manager";
  managedDepartments: string[];
  isActive: boolean;
}

class ManagersStore {
  private managers: ManagerRecord[] = [];

  getAll(): ManagerRecord[] {
    return this.managers;
  }

  getByFinancialNumber(financialNumber: string): ManagerRecord | undefined {
    return this.managers.find((m) => m.financialNumber === financialNumber);
  }

  async syncFromApi(): Promise<void> {
    try {
      const data = await lookupUsersApi(["manager", "office_manager"]);
      if (!data || data.length === 0) return;

      this.managers = data.map((u) => ({
        id: u.id,
        financialNumber: u.financialNumber ?? "",
        nationalId: u.nationalId ?? undefined,
        name: u.name,
        jobTitle: u.jobTitle ?? "",
        department: u.department ?? "",
        workPlace: u.workPlace ?? undefined,
        workType: u.workType ?? undefined,
        phone: u.phone ?? undefined,
        status: u.isActive ? "active" : "suspended",
        managerType: u.role as "manager" | "office_manager",
        managedDepartments: [u.department ?? ""],
        isActive: u.isActive,
      }));
    } catch {
      // keep current in-memory data if sync fails
    }
  }
}

export const managersStore = new ManagersStore();
