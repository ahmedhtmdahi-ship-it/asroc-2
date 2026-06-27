import { supabase } from "@/app/lib/supabaseClient";
import { profileRowToUser } from "@/app/features/auth/AuthContext";
import type { User } from "@/app/types/user";
import { DEV_TEST_USERS } from "@/app/data/testUsers";
import { mockUsers } from "@/app/data/mockUsers";

const isDev = import.meta.env.DEV;

class ProfilesStore {
  private profiles: User[] = isDev ? [...DEV_TEST_USERS, ...mockUsers] : [];

  getAll(): User[] {
    return this.profiles;
  }

  getById(id: string): User | undefined {
    return this.profiles.find((u) => u.id === id || u.financialNumber === id);
  }

  getByRole(role: string): User[] {
    return this.profiles.filter((u) => u.role === role);
  }

  async syncFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, name, financial_number, job_title, work_place, department, national_id, phone, work_type, role, permissions, is_active")
        .limit(1000);

      if (error || !data) return;
      this.profiles = (data as Record<string, unknown>[]).map(profileRowToUser);
    } catch {
      // keep empty — callers handle missing data gracefully
    }
  }
}

export const profilesStore = new ProfilesStore();
