import { listUsersApi } from "@/app/lib/dataApi";
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

  // ملاحظة: الاسم متساب زي ما هو مؤقتًا — المصدر بقى الـ API مش Supabase.
  async syncFromSupabase(): Promise<void> {
    try {
      const data = await listUsersApi();
      this.profiles = data.map(apiUserToUser);
    } catch {
      // keep empty — callers handle missing data gracefully
    }
  }
}

export const profilesStore = new ProfilesStore();
