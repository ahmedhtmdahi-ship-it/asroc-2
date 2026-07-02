import { lookupUsersApi } from "@/app/lib/dataApi";
import { apiUserToUser } from "@/app/lib/authApi";
import type { User } from "@/app/types/user";

class ProfilesStore {
  private profiles: User[] = [];

  getAll(): User[] {
    return this.profiles;
  }

  getById(id: string): User | undefined {
    return this.profiles.find((u) => u.id === id || u.financialNumber === id);
  }

  getByRole(role: string): User[] {
    return this.profiles.filter((u) => u.role === role);
  }

  async syncFromApi(): Promise<void> {
    try {
      const data = await lookupUsersApi();
      this.profiles = data.map((u) => apiUserToUser({
        id: u.id,
        username: "",
        financialNumber: u.financialNumber,
        name: u.name,
        jobTitle: u.jobTitle,
        workPlace: u.workPlace,
        department: u.department,
        nationalId: null,
        phone: null,
        workType: u.workType,
        role: u.role,
        permissions: [],
        isActive: u.isActive,
      }));
    } catch {
      // keep empty — callers handle missing data gracefully
    }
  }
}

export const profilesStore = new ProfilesStore();
