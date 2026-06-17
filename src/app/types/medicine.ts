export interface Medicine {
  id: string;
  name: string;
  unit: string;
  currentStock?: number | null;
  minimumStock?: number | null;
  category?: string;
  activeIngredient?: string;
  isActive: boolean;
  updatedAt?: string;
}

export type MedicineInput = Omit<Medicine, "id" | "updatedAt">;

