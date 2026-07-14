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
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  getAll() {
    return this.medicines;
  }

  /**
   * تحميل الكتالوج مرة واحدة عند أول صفحة محتاجاه (صيدلية/طبيب/مخزون).
   * مش بنحمّل الـ ~19 ألف دواء عالميًا لكل مستخدم وقت الدخول — أغلب المستخدمين
   * (موظفين/أمن/مديرين) عمرهم ما بيلمسوا الأدوية. النداءات المتزامنة بتتوحّد على
   * نفس الـ promise، ولو التحميل فشل بيفضل loaded=false فالصفحة اللي بعدها تعيد المحاولة.
   */
  ensureLoaded(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this.syncFromApi().finally(() => {
      this.loadingPromise = null;
    });
    return this.loadingPromise;
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
      this.loaded = true; // نجح الاتصال — الكتالوج اتحمّل (حتى لو رجع فاضي)
      // رد فاضي وإحنا عندنا داتا بالفعل = غالبًا رد عابر → نحافظ على الموجود.
      if ((!data || data.length === 0) && this.medicines.length > 0) return;

      this.medicines = (data ?? []).map(normalizeMedicine);
      this.emit();
    } catch {
      // فشل الاتصال — نسيب الداتا الحالية و loaded زي ما هي (إعادة المحاولة لاحقًا)
    }
  }
}

export const medicineStore = new MedicineStore();

