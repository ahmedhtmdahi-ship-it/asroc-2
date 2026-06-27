import { useMemo, useState } from "react";
import {
  Edit3,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { medicineStore } from "@/app/store/medicineStore";
import type { Medicine } from "@/app/types/medicine";

type MedicineForm = {
  name: string;
  unit: string;
  currentStock: string;
  minimumStock: string;
  category: string;
  activeIngredient: string;
};

const emptyForm: MedicineForm = {
  name: "",
  unit: "",
  currentStock: "",
  minimumStock: "",
  category: "",
  activeIngredient: "",
};

function toForm(medicine: Medicine): MedicineForm {
  return {
    name: medicine.name,
    unit: medicine.unit,
    currentStock:
      typeof medicine.currentStock === "number" ? String(medicine.currentStock) : "",
    minimumStock:
      typeof medicine.minimumStock === "number" ? String(medicine.minimumStock) : "",
    category: medicine.category || "",
    activeIngredient: medicine.activeIngredient || "",
  };
}

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : null;
}

function stockStatus(medicine: Medicine) {
  if (typeof medicine.currentStock !== "number") {
    return { label: "كتالوج", className: "bg-slate-100 text-slate-700" };
  }

  if (medicine.currentStock <= 0) {
    return { label: "غير متوفر", className: "bg-red-100 text-red-700" };
  }

  if (
    typeof medicine.minimumStock === "number" &&
    medicine.currentStock <= medicine.minimumStock
  ) {
    return { label: "منخفض", className: "bg-orange-100 text-orange-700" };
  }

  return { label: "متوفر", className: "bg-teal-100 text-teal-700" };
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="text-left">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MedicineInventoryManager({ compact = false }: { compact?: boolean }) {
  const [medicines, setMedicines] = useState<Medicine[]>(() => medicineStore.getAll());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MedicineForm>(emptyForm);

  const trackedMedicines = medicines.filter(
    (medicine) => typeof medicine.currentStock === "number"
  );
  const lowStock = medicines.filter((medicine) => {
    return (
      typeof medicine.currentStock === "number" &&
      medicine.currentStock > 0 &&
      typeof medicine.minimumStock === "number" &&
      medicine.currentStock <= medicine.minimumStock
    );
  });
  const unavailable = medicines.filter(
    (medicine) => typeof medicine.currentStock === "number" && medicine.currentStock <= 0
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? medicines.filter((medicine) =>
          [
            medicine.name,
            medicine.unit,
            medicine.category,
            medicine.activeIngredient,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        )
      : medicines;

    return list.slice(0, compact ? 80 : 250);
  }, [compact, medicines, search]);

  const refresh = () => setMedicines([...medicineStore.getAll()]);

  const openAddDialog = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (medicine: Medicine) => {
    setEditing(medicine);
    setForm(toForm(medicine));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("اكتب اسم الدواء");
      return;
    }

    const payload = {
      name: form.name.trim(),
      unit: form.unit.trim() || "وحدة",
      currentStock: numberOrNull(form.currentStock),
      minimumStock: numberOrNull(form.minimumStock),
      category: form.category.trim(),
      activeIngredient: form.activeIngredient.trim(),
      isActive: true,
    };

    if (editing) {
      medicineStore.update(editing.id, payload);
      toast.success("تم تعديل الدواء");
    } else {
      medicineStore.add(payload);
      toast.success("تم إضافة الدواء");
    }

    refresh();
    setDialogOpen(false);
  };

  const handleDelete = (medicine: Medicine) => {
    medicineStore.remove(medicine.id);
    refresh();
    toast.success("تم حذف الدواء من الكتالوج المحلي");
  };

  const handleReset = () => {
    medicineStore.resetToSeed().then(() => {
      refresh();
      toast.success("تم استرجاع كتالوج الأدوية الأصلي من الشيت");
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="إجمالي الأصناف"
          value={medicines.length}
          icon={Package}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard
          label="أصناف بكميات"
          value={trackedMedicines.length}
          icon={PackageCheck}
          color="text-teal-700"
          bg="bg-teal-50"
        />
        <StatCard
          label="مخزون منخفض"
          value={lowStock.length}
          icon={PackageX}
          color="text-orange-700"
          bg="bg-orange-50"
        />
        <StatCard
          label="غير متوفر"
          value={unavailable.length}
          icon={PackageX}
          color="text-red-700"
          bg="bg-red-50"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>كتالوج ومخزون الأدوية</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="ml-2 h-4 w-4" />
                استرجاع الشيت
              </Button>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة دواء
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 pr-10"
              placeholder="بحث باسم الدواء أو الوحدة أو المادة الفعالة..."
            />
          </div>

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 text-right">اسم الدواء</th>
                  <th className="p-3 text-right">الوحدة</th>
                  <th className="p-3 text-right">الرصيد</th>
                  <th className="p-3 text-right">حد التنبيه</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {filtered.map((medicine) => {
                  const status = stockStatus(medicine);

                  return (
                    <tr key={medicine.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">
                        {medicine.name}
                        {medicine.activeIngredient && (
                          <p className="mt-1 text-xs font-normal text-slate-500">
                            {medicine.activeIngredient}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{medicine.unit}</td>
                      <td className="p-3">
                        {typeof medicine.currentStock === "number"
                          ? medicine.currentStock
                          : "غير مسجل"}
                      </td>
                      <td className="p-3">
                        {typeof medicine.minimumStock === "number"
                          ? medicine.minimumStock
                          : "غير مسجل"}
                      </td>
                      <td className="p-3">
                        <Badge className={status.className}>{status.label}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditDialog(medicine)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600"
                            onClick={() => handleDelete(medicine)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-slate-500">
            يتم عرض أول {compact ? 80 : 250} نتيجة فقط للحفاظ على سرعة الصفحة. استخدم البحث للوصول لأي صنف من الكتالوج الكامل.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل دواء" : "إضافة دواء"}</DialogTitle>
            <DialogDescription>
              البيانات التي تضيفها هنا تحفظ داخل البرنامج وتظهر في الصيدلية فوراً.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>اسم الدواء</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="اسم الصنف"
              />
            </div>
            <div className="space-y-2">
              <Label>الوحدة</Label>
              <Input
                value={form.unit}
                onChange={(event) => setForm({ ...form, unit: event.target.value })}
                placeholder="قرص / زجاجة / أمبول"
              />
            </div>
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Input
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                placeholder="اختياري"
              />
            </div>
            <div className="space-y-2">
              <Label>الرصيد الحالي</Label>
              <Input
                type="number"
                min="0"
                value={form.currentStock}
                onChange={(event) =>
                  setForm({ ...form, currentStock: event.target.value })
                }
                placeholder="اتركه فارغ لو كتالوج فقط"
              />
            </div>
            <div className="space-y-2">
              <Label>حد التنبيه</Label>
              <Input
                type="number"
                min="0"
                value={form.minimumStock}
                onChange={(event) =>
                  setForm({ ...form, minimumStock: event.target.value })
                }
                placeholder="اختياري"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>المادة الفعالة</Label>
              <Input
                value={form.activeIngredient}
                onChange={(event) =>
                  setForm({ ...form, activeIngredient: event.target.value })
                }
                placeholder="اختياري"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave}>{editing ? "حفظ التعديل" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

