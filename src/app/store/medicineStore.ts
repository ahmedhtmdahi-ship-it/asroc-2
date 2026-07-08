import {
  createMedicineApi,
  deleteMedicineApi,
  listMedicinesApi,
  updateMedicineApi,
} from "@/app/lib/dataApi";
import type { Medicine, MedicineInput } from "@/app/types/medicine";
import { ReactiveStore } from "./reactiveStore";

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

class MedicineStore extends ReactiveStore {
  private medicines: Medicine[] = [];

  getAll() {
    return this.medicines;
  }

  getById(id: string) {
    return this.medicines.find((medicine) => medicine.id === id);
  }

  async add(input: MedicineInput): Promise<Medicine> {
    const created = await createMedicineApi(input);
    const medicine = normalizeMedicine(created);
    this.medicines = [medicine, ...this.medicines];
    this.emit();
    return medicine;
  }

  async update(id: string, input: Partial<MedicineInput>): Promise<Medicine | null> {
    const updated = await updateMedicineApi(id, input);
    const normalized = normalizeMedicine(updated);
    const index = this.medicines.findIndex((medicine) => medicine.id === id);
    if (index === -1) {
      this.medicines = [normalized, ...this.medicines];
      this.emit();
      return normalized;
    }

    this.medicines = [
      ...this.medicines.slice(0, index),
      normalized,
      ...this.medicines.slice(index + 1),
    ];
    this.emit();
    return normalized;
  }

  async remove(id: string): Promise<boolean> {
    const response = await deleteMedicineApi(id);
    if (!response.ok) return false;
    this.medicines = this.medicines.filter((medicine) => medicine.id !== id);
    this.emit();
    return true;
  }

  async resetToSeed(): Promise<void> {
    await this.syncFromApi();
  }

  async syncFromApi(): Promise<void> {
    try {
      const data = await listMedicinesApi();
      if (!data || data.length === 0) return;

      this.medicines = data.map(normalizeMedicine);
      this.emit();
    } catch {
      // keep current in-memory data if sync fails
    }
  }
}

export const medicineStore = new MedicineStore();

