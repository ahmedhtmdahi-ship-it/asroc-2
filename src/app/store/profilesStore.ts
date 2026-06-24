import { supabase } from "@/app/lib/supabaseClient";
import { profileRowToUser } from "@/app/features/auth/AuthContext";
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

  async syncFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, name, financial_number, job_title, work_place, department, national_id, phone, work_type, role, permissions, is_active");

      if (error || !data) return;
      this.profiles = (data as Record<string, unknown>[]).map(profileRowToUser);
    } catch {
      // keep empty — callers handle missing data gracefully
    }
  }
}

export const profilesStore = new ProfilesStore();
