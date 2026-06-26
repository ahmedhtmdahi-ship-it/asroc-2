import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarDays, Loader2, Package, PackagePlus,
  Plus, Search, Boxes,
} from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { apiClient } from "@/app/services/apiClient";
import { useAuth } from "@/app/features/auth/AuthContext";

type Batch = {
  id: number;
  medicine_id: number;
  medicine_name?: string;
  supplier?: { id: number; name: string } | null;
  batch_number?: string;
  expiry_date?: string;
  quantity_received: number;
  quantity_remaining: number;
  purchase_price_per_unit?: number;
  received_at?: string;
  is_expired: boolean;
  is_expiring_soon: boolean;
  notes?: string;
};

type Medicine = { id: number; name: string };
type Supplier = { id: number; name: string };

type AddForm = {
  medicine_id: string;
  supplier_id: string;
  batch_number: string;
  expiry_date: string;
  quantity_received: string;
  purchase_price_per_unit: string;
  received_at: string;
  notes: string;
};

const emptyAddForm: AddForm = {
  medicine_id: "", supplier_id: "", batch_number: "", expiry_date: "",
  quantity_received: "", purchase_price_per_unit: "", received_at: "", notes: "",
};

function formatDate(v?: string) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("ar-EG");
}

export function MedicineBatchesPage() {
  const { isApiConnected } = useAuth();
  const [batches, setBatches]         = useState<Batch[]>([]);
  const [medicines, setMedicines]     = useState<Medicine[]>([]);
  const [suppliers, setSuppliers]     = useState<Supplier[]>([]);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<"all" | "expiring" | "expired">("all");
  const [addOpen, setAddOpen]         = useState(false);
  const [addForm, setAddForm]         = useState<AddForm>(emptyAddForm);
  const [adjustTarget, setAdjustTarget] = useState<Batch | null>(null);
  const [adjustQty, setAdjustQty]     = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const fetchAll = () => {
    if (!isApiConnected) return;
    setLoading(true);
    Promise.all([
      apiClient.get("/medicine-batches?per_page=500"),
      apiClient.get("/medicines?per_page=500"),
      apiClient.get("/suppliers?per_page=200"),
    ]).then(([b, m, s]: any[]) => {
      setBatches(Array.isArray(b) ? b : (b?.data ?? []));
      setMedicines(Array.isArray(m) ? m : (m?.data ?? []));
      setSuppliers(Array.isArray(s) ? s : (s?.data ?? []));
    }).catch(() => toast.error("فشل تحميل البيانات"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [isApiConnected]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return batches.filter((b) => {
      const matchFilter =
        filter === "all" ? true :
        filter === "expiring" ? b.is_expiring_soon && !b.is_expired :
        b.is_expired;
      const matchSearch = !term ||
        (b.medicine_name ?? "").toLowerCase().includes(term) ||
        (b.batch_number ?? "").toLowerCase().includes(term) ||
        (b.supplier?.name ?? "").toLowerCase().includes(term);
      return matchFilter && matchSearch;
    });
  }, [batches, search, filter]);

  const expiredCount  = batches.filter((b) => b.is_expired).length;
  const expiringCount = batches.filter((b) => b.is_expiring_soon && !b.is_expired).length;
  const totalRemaining = batches.reduce((s, b) => s + (b.quantity_remaining ?? 0), 0);

  const handleAddBatch = async () => {
    if (!addForm.medicine_id || !addForm.quantity_received) {
      toast.error("الدواء والكمية مطلوبان"); return;
    }
    setSaving(true);
    try {
      await apiClient.post("/medicine-batches", {
        medicine_id: Number(addForm.medicine_id),
        supplier_id: addForm.supplier_id ? Number(addForm.supplier_id) : undefined,
        batch_number: addForm.batch_number || undefined,
        expiry_date: addForm.expiry_date || undefined,
        quantity_received: Number(addForm.quantity_received),
        purchase_price_per_unit: addForm.purchase_price_per_unit ? Number(addForm.purchase_price_per_unit) : undefined,
        received_at: addForm.received_at || undefined,
        notes: addForm.notes || undefined,
      });
      toast.success("تم إضافة الدُفعة");
      setAddOpen(false); setAddForm(emptyAddForm); fetchAll();
    } catch (err: any) {
      toast.error("فشل الإضافة", { description: err?.message });
    } finally { setSaving(false); }
  };

  const handleAdjust = async () => {
    if (!adjustTarget || !adjustQty) { toast.error("الكمية مطلوبة"); return; }
    setSaving(true);
    try {
      await apiClient.post(`/medicine-batches/${adjustTarget.id}/adjust`, {
        quantity_change: Number(adjustQty),
        reason: adjustReason || undefined,
      });
      toast.success("تم تعديل الكمية");
      setAdjustTarget(null); setAdjustQty(""); setAdjustReason(""); fetchAll();
    } catch (err: any) {
      toast.error("فشل التعديل", { description: err?.message });
    } finally { setSaving(false); }
  };

  return (
    <PageLayout
      title="دُفعات الأدوية"
      subtitle="تتبع المخزون وتواريخ الانتهاء"
      icon={<Boxes className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{batches.length}</p>
          <p className="mt-1 text-xs text-slate-500">إجمالي الدُفعات</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-teal-700">{totalRemaining.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">إجمالي المخزون المتبقي</p>
        </CardContent></Card>
        <Card
          className={`cursor-pointer transition ${filter === "expiring" ? "ring-2 ring-orange-400" : ""}`}
          onClick={() => setFilter(filter === "expiring" ? "all" : "expiring")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{expiringCount}</p>
            <p className="mt-1 text-xs text-slate-500">تنتهي خلال 30 يوم</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition ${filter === "expired" ? "ring-2 ring-red-400" : ""}`}
          onClick={() => setFilter(filter === "expired" ? "all" : "expired")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
            <p className="mt-1 text-xs text-slate-500">منتهية الصلاحية</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pr-10" placeholder="بحث بالدواء أو رقم الدُفعة أو المورد..." />
        </div>
        <div className="flex gap-2">
          {filter !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setFilter("all")}>إلغاء الفلتر</Button>
          )}
          {isApiConnected && (
            <Button onClick={() => { setAddForm(emptyAddForm); setAddOpen(true); }}>
              <Plus className="ml-2 h-4 w-4" />إضافة دُفعة
            </Button>
          )}
        </div>
      </div>

      {loading && <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}
      {!loading && !isApiConnected && <Card><CardContent className="p-10 text-center text-slate-500">غير متصل بالخادم.</CardContent></Card>}
      {!loading && isApiConnected && filtered.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">لا توجد نتائج.</CardContent></Card>}

      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["الدواء", "رقم الدُفعة", "المورد", "الكمية المستلمة", "المتبقي", "تاريخ الانتهاء", "الحالة", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap p-3 text-right font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((b) => (
                <tr key={b.id} className={`hover:bg-slate-50 ${b.is_expired ? "bg-red-50/40" : b.is_expiring_soon ? "bg-orange-50/40" : ""}`}>
                  <td className="p-3 font-medium text-slate-900">{b.medicine_name ?? "—"}</td>
                  <td className="p-3 text-slate-500">{b.batch_number ?? "—"}</td>
                  <td className="p-3 text-slate-500">{b.supplier?.name ?? "—"}</td>
                  <td className="p-3 text-center">{b.quantity_received}</td>
                  <td className="p-3 text-center font-bold text-slate-800">{b.quantity_remaining}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatDate(b.expiry_date)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {b.is_expired ? (
                      <Badge className="bg-red-100 text-red-700">منتهية</Badge>
                    ) : b.is_expiring_soon ? (
                      <Badge className="bg-orange-100 text-orange-700"><AlertTriangle className="ml-1 h-3 w-3" />قريباً</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700">سليمة</Badge>
                    )}
                  </td>
                  {isApiConnected && (
                    <td className="p-3">
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs"
                        onClick={() => { setAdjustTarget(b); setAdjustQty(""); setAdjustReason(""); }}>
                        <Package className="h-3.5 w-3.5" />تعديل الكمية
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Batch Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5" />إضافة دُفعة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>الدواء *</Label>
              <Select value={addForm.medicine_id} onValueChange={(v) => setAddForm({ ...addForm, medicine_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الدواء" /></SelectTrigger>
                <SelectContent>{medicines.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>المورد</Label>
              <Select value={addForm.supplier_id} onValueChange={(v) => setAddForm({ ...addForm, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>رقم الدُفعة</Label>
              <Input value={addForm.batch_number} onChange={(e) => setAddForm({ ...addForm, batch_number: e.target.value })} placeholder="مثال: B-2026-001" />
            </div>
            <div className="space-y-1.5">
              <Label>الكمية المستلمة *</Label>
              <Input type="number" min="1" value={addForm.quantity_received} onChange={(e) => setAddForm({ ...addForm, quantity_received: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>سعر الوحدة (جنيه)</Label>
              <Input type="number" step="0.01" value={addForm.purchase_price_per_unit} onChange={(e) => setAddForm({ ...addForm, purchase_price_per_unit: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الانتهاء</Label>
              <Input type="date" value={addForm.expiry_date} onChange={(e) => setAddForm({ ...addForm, expiry_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الاستلام</Label>
              <Input type="date" value={addForm.received_at} onChange={(e) => setAddForm({ ...addForm, received_at: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>ملاحظات</Label>
              <Input value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleAddBatch} disabled={saving}>
              {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Quantity Dialog */}
      <Dialog open={adjustTarget !== null} onOpenChange={(o) => { if (!o) setAdjustTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل كمية الدُفعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              دواء: <span className="font-bold">{adjustTarget?.medicine_name}</span>
              <br />المتبقي حالياً: <span className="font-bold">{adjustTarget?.quantity_remaining}</span>
            </p>
            <div className="space-y-1.5">
              <Label>تغيير الكمية (موجب للإضافة، سالب للخصم)</Label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="مثال: +50 أو -10" />
            </div>
            <div className="space-y-1.5">
              <Label>السبب</Label>
              <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="مثال: جرد / تلف / إرجاع" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAdjustTarget(null)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleAdjust} disabled={saving}>
              {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}تأكيد التعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
