import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Pencil, Phone, Plus, Search, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { apiClient } from "@/app/services/apiClient";
import { useAuth } from "@/app/features/auth/AuthContext";

type Supplier = {
  id: number;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
};

type SupplierForm = {
  name: string; contact_name: string; phone: string;
  email: string; address: string; notes: string;
};

const emptyForm: SupplierForm = { name: "", contact_name: "", phone: "", email: "", address: "", notes: "" };

export function SuppliersPage() {
  const { isApiConnected } = useAuth();
  const [suppliers, setSuppliers]     = useState<Supplier[]>([]);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState("");
  const [dialogMode, setDialogMode]   = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [form, setForm]               = useState<SupplierForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const fetchSuppliers = () => {
    if (!isApiConnected) return;
    setLoading(true);
    apiClient.get("/suppliers?per_page=200")
      .then((res: any) => setSuppliers(Array.isArray(res) ? res : (res?.data ?? [])))
      .catch(() => toast.error("فشل تحميل الموردين"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, [isApiConnected]);

  const openCreate = () => { setEditingItem(null); setForm(emptyForm); setDialogMode("create"); };
  const openEdit   = (s: Supplier) => {
    setEditingItem(s);
    setForm({ name: s.name, contact_name: s.contact_name ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", notes: s.notes ?? "" });
    setDialogMode("edit");
  };
  const closeDialog = () => { setDialogMode(null); setEditingItem(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("اسم المورد مطلوب"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (dialogMode === "create") {
        await apiClient.post("/suppliers", payload);
        toast.success("تم إضافة المورد");
      } else if (editingItem) {
        await apiClient.put(`/suppliers/${editingItem.id}`, payload);
        toast.success("تم تعديل البيانات");
      }
      closeDialog(); fetchSuppliers();
    } catch (err: any) {
      toast.error("فشل الحفظ", { description: err?.message });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiClient.delete(`/suppliers/${deleteTarget.id}`);
      toast.success("تم الحذف");
      setDeleteTarget(null); fetchSuppliers();
    } catch (err: any) {
      toast.error(err?.message ?? "فشل الحذف");
    } finally { setSaving(false); }
  };

  const handleToggle = async (s: Supplier) => {
    try {
      await apiClient.post(`/suppliers/${s.id}/toggle-status`);
      toast.success(s.is_active ? "تم إيقاف المورد" : "تم تفعيل المورد");
      fetchSuppliers();
    } catch { toast.error("فشل تغيير الحالة"); }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return suppliers.filter((s) =>
      !term ||
      s.name.toLowerCase().includes(term) ||
      (s.contact_name ?? "").toLowerCase().includes(term) ||
      (s.phone ?? "").includes(term)
    );
  }, [suppliers, search]);

  const activeCount   = suppliers.filter((s) => s.is_active).length;
  const inactiveCount = suppliers.length - activeCount;

  return (
    <PageLayout
      title="الموردون"
      subtitle="إدارة موردي الأدوية والمستلزمات"
      icon={<Building2 className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          ["إجمالي الموردين", suppliers.length, "text-blue-700"],
          ["نشط", activeCount, "text-green-700"],
          ["موقوف", inactiveCount, "text-slate-500"],
        ].map(([label, value, color]) => (
          <Card key={String(label)}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pr-10" placeholder="بحث بالاسم أو جهة الاتصال أو التليفون..." />
        </div>
        {isApiConnected && (
          <Button onClick={openCreate}>
            <Plus className="ml-2 h-4 w-4" />إضافة مورد
          </Button>
        )}
      </div>

      {loading && <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}

      {!loading && !isApiConnected && (
        <Card><CardContent className="p-10 text-center text-slate-500">غير متصل بالخادم.</CardContent></Card>
      )}

      {!loading && isApiConnected && filtered.length === 0 && (
        <Card><CardContent className="p-10 text-center text-slate-500">لا توجد نتائج.</CardContent></Card>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["المورد", "جهة الاتصال", "التليفون", "الحالة", ""].map((h) => (
                  <th key={h} className="p-3 text-right font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    {s.address && <p className="text-xs text-slate-400">{s.address}</p>}
                  </td>
                  <td className="p-3 text-slate-600">{s.contact_name || "—"}</td>
                  <td className="p-3 text-slate-600 ltr:text-right" dir="ltr">{s.phone || "—"}</td>
                  <td className="p-3">
                    <Badge className={s.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                      {s.is_active ? "نشط" : "موقوف"}
                    </Badge>
                  </td>
                  {isApiConnected && (
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => openEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />تعديل
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => handleToggle(s)}>
                          {s.is_active
                            ? <><ToggleLeft className="h-3.5 w-3.5" />إيقاف</>
                            : <><ToggleRight className="h-3.5 w-3.5" />تفعيل</>}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(s)}>
                          <Trash2 className="h-3.5 w-3.5" />حذف
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "إضافة مورد جديد" : "تعديل بيانات المورد"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>اسم المورد *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: شركة النيل للأدوية" />
            </div>
            <div className="space-y-1.5">
              <Label>جهة الاتصال</Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="اسم المسؤول" />
            </div>
            <div className="space-y-1.5">
              <Label>التليفون</Label>
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="supplier@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="شارع / حي / مدينة" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="أي ملاحظات إضافية" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {dialogMode === "create" ? "إضافة" : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف <span className="font-bold text-slate-900">{deleteTarget?.name}</span>؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
