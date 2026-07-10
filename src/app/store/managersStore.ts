import { lookupUsersApi } from "@/app/lib/dataApi";
import { ReactiveStore } from "./reactiveStore";

interface ManagerRecord {
  id: string;
  financialNumber: string;
  name: string;
  jobTitle: string;
  department?: string;
  status: "active" | "retired" | "on_leave" | "suspended";
  managerType: "manager" | "office_manager";
  managedDepartments: string[];
  isActive: boolean;
}

class ManagersStore extends ReactiveStore {
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
        name: u.name,
        jobTitle: u.jobTitle ?? "",
        department: u.department ?? "",
        status: u.isActive ? "active" : "suspended",
        managerType: u.role as "manager" | "office_manager",
        managedDepartments: [u.department ?? ""],
        isActive: u.isActive,
      }));
      this.emit();
    } catch {
      // keep current in-memory data if sync fails
    }
  }
}

export const managersStore = new ManagersStore();
