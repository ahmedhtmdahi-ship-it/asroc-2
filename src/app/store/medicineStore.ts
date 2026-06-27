import { supabase } from "@/app/lib/supabaseClient";
import type { Medicine, MedicineInput } from "@/app/types/medicine";

const STORAGE_KEY = "asorc_medicines";

function normalizeMedicine(medicine: Medicine): Medicine {
  return {
    ...medicine,
    unit: medicine.unit?.trim() || "وحدة",
    currentStock:
      typeof medicine.currentStock === "number" ? medicine.currentStock : null,
    minimumStock:
      typeof medicine.minimumStock === "number" ? medicine.minimumStock : null,
    isActive: medicine.isActive !== false,
  };
}

function fromDb(row: Record<string, unknown>): Medicine {
  return normalizeMedicine({
    id: row.id as string,
    name: row.name as string,
    unit: (row.unit as string) || "وحدة",
    currentStock: row.current_stock as number | null,
    minimumStock: row.minimum_stock as number | null,
    category: (row.category as string) || "",
    activeIngredient: (row.active_ingredient as string) || "",
    isActive: (row.is_active as boolean) ?? true,
    updatedAt: (row.updated_at as string) ?? undefined,
  });
}

function loadMedicines(): Medicine[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map(normalizeMedicine)
      : [];
  } catch {
    return [];
  }
}

class MedicineStore {
  private medicines: Medicine[] = loadMedicines();

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.medicines));
  }

  getAll() {
    return this.medicines;
  }

  getById(id: string) {
    return this.medicines.find((medicine) => medicine.id === id);
  }

  add(input: MedicineInput) {
    const medicine: Medicine = normalizeMedicine({
      ...input,
      id: `MED-CUSTOM-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    });

    this.medicines = [medicine, ...this.medicines];
    this.persist();
    return medicine;
  }

  update(id: string, input: Partial<MedicineInput>) {
    const index = this.medicines.findIndex((medicine) => medicine.id === id);
    if (index === -1) return null;

    const updated = normalizeMedicine({
      ...this.medicines[index],
      ...input,
      updatedAt: new Date().toISOString(),
    });

    this.medicines = [
      ...this.medicines.slice(0, index),
      updated,
      ...this.medicines.slice(index + 1),
    ];
    this.persist();
    return updated;
  }

  remove(id: string) {
    const before = this.medicines.length;
    this.medicines = this.medicines.filter((medicine) => medicine.id !== id);
    this.persist();
    return this.medicines.length < before;
  }

  async loadDevSeed(): Promise<void> {
    if (!import.meta.env.DEV) return;
    if (this.medicines.length > 0) return;
    const { medicinesSeed } = await import("@/app/data/medicinesSeed");
    this.medicines = medicinesSeed.map(normalizeMedicine);
    this.persist();
  }

  async resetToSeed(): Promise<void> {
    const { medicinesSeed } = await import("@/app/data/medicinesSeed");
    this.medicines = medicinesSeed.map(normalizeMedicine);
    this.persist();
  }

  async syncFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .order("name", { ascending: true });

      if (error || !data || data.length === 0) return;

      this.medicines = (data as Record<string, unknown>[]).map(fromDb);
      this.persist();
    } catch {
      // keep local data as fallback
    }
  }
}

export const medicineStore = new MedicineStore();

