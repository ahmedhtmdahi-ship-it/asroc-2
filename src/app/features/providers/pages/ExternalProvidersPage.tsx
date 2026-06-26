import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  FlaskConical,
  Hospital,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/app/components/PageLayout";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { apiClient } from "@/app/services/apiClient";
import { useAuth } from "@/app/features/auth/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────
type ProviderType = "clinic" | "doctor" | "radiology_center" | "hospital" | "lab";

type ExternalProvider = {
  id: number;
  name: string;
  type: ProviderType;
  specialty: string;
  address?: string;
  phone?: string;
  notes?: string;
};

type ProviderForm = {
  name: string;
  type: ProviderType;
  specialty: string;
  address: string;
  phone: string;
  notes: string;
};

const emptyForm: ProviderForm = {
  name: "", type: "clinic", specialty: "",
  address: "", phone: "", notes: "",
};

// ─── Constants ───────────────────────────────────────────────────────
const TYPE_LABELS: Record<ProviderType, string> = {
  clinic:           "عيادة",
  doctor:           "طبيب خاص",
  radiology_center: "مركز أشعة",
  hospital:         "مستشفى",
  lab:              "معمل تحاليل",
};

const TYPE_COLORS: Record<ProviderType, string> = {
  clinic:           "bg-blue-100 text-blue-700",
  doctor:           "bg-teal-100 text-teal-700",
  radiology_center: "bg-purple-100 text-purple-700",
  hospital:         "bg-red-100 text-red-700",
  lab:              "bg-orange-100 text-orange-700",
};

function TypeIcon({ type }: { type: ProviderType }) {
  const cls = "h-5 w-5";
  switch (type) {
    case "clinic":           return <Building2 className={cls} />;
    case "doctor":           return <UserRound className={cls} />;
    case "radiology_center": return <FlaskConical className={cls} />;
    case "hospital":         return <Hospital className={cls} />;
    case "lab":              return <FlaskConical className={cls} />;
  }
}

export function ExternalProvidersPage() {
  const { isApiConnected } = useAuth();
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const [filterType, setFilterType] = useState<ProviderType | "all">("all");

  const [dialogMode, setDialogMode]     = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem]   = useState<ExternalProvider | null>(null);
  const [form, setForm]                 = useState<ProviderForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ExternalProvider | null>(null);

  const fetchProviders = () => {
    if (!isApiConnected) return;
    setLoading(true);
    apiClient
      .get("/external-providers?per_page=500")
      .then((res: any) => setProviders(Array.isArray(res) ? res : (res?.data ?? [])))
      .catch(() => toast.error("فشل تحميل مقدمي الخدمات"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProviders(); }, [isApiConnected]);

  const openCreate = () => { setEditingItem(null); setForm(emptyForm); setDialogMode("create"); };
  const openEdit   = (p: ExternalProvider) => {
    setEditingItem(p);
    setForm({ name: p.name, type: p.type, specialty: p.specialty, address: p.address ?? "", phone: p.phone ?? "", notes: p.notes ?? "" });
    setDialogMode("edit");
  };
  const closeDialog = () => { setDialogMode(null); setEditingItem(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.specialty.trim()) {
      toast.error("الاسم والتخصص مطلوبان"); return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), type: form.type,
        specialty: form.specialty.trim(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (dialogMode === "create") {
        await apiClient.post("/external-providers", payload);
        toast.success("تم إضافة مقدم الخدمة");
      } else if (editingItem) {
        await apiClient.put(`/external-providers/${editingItem.id}`, payload);
        toast.success("تم تعديل البيانات");
      }
      closeDialog(); fetchProviders();
    } catch (err: any) {
      toast.error("فشل الحفظ", { description: err?.message ?? "حدث خطأ" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiClient.delete(`/external-providers/${deleteTarget.id}`);
      toast.success("تم الحذف");
      setDeleteTarget(null); fetchProviders();
    } catch (err: any) {
      toast.error(err?.message ?? "فشل الحذف");
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return providers.filter((p) => {
      const matchType    = filterType === "all" || p.type === filterType;
      const matchSearch  = !term ||
        p.name.toLowerCase().includes(term) ||
        p.specialty.toLowerCase().includes(term) ||
        (p.address ?? "").toLowerCase().includes(term);
      return matchType && matchSearch;
    });
  }, [providers, search, filterType]);

  // stats
  const typeCounts = useMemo(() =>
    providers.reduce<Record<string, number>>((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1; return acc;
    }, {}), [providers]);

  return (
    <PageLayout
      title="مقدمو الخدمات الخارجية"
      subtitle="العيادات والأطباء والمراكز المتعاقد معها"
      icon={<Stethoscope className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {(["clinic", "doctor", "radiology_center", "hospital", "lab"] as ProviderType[]).map((t) => (
          <Card
            key={t}
            className={`cursor-pointer transition ${filterType === t ? "ring-2 ring-teal-500" : ""}`}
            onClick={() => setFilterType(filterType === t ? "all" : t)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{typeCounts[t] ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">{TYPE_LABELS[t]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pr-10"
            placeholder="بحث بالاسم أو التخصص أو العنوان..."
          />
        </div>
        <div className="flex items-center gap-2">
          {filterType !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setFilterType("all")}>
              إلغاء الفلتر
            </Button>
          )}
          {isApiConnected && (
            <Button onClick={openCreate}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة مقدم خدمة
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {!loading && !isApiConnected && (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            غير متصل بالخادم — لا يمكن عرض البيانات.
          </CardContent>
        </Card>
      )}

      {!loading && isApiConnected && filtered.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            {search || filterType !== "all" ? "لا توجد نتائج مطابقة." : "لا يوجد مقدمو خدمات مسجلون. ابدأ بإضافة أول مقدم خدمة."}
          </CardContent>
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((provider) => (
            <Card key={provider.id} className="hover:shadow-md transition">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TYPE_COLORS[provider.type]}`}>
                      <TypeIcon type={provider.type} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{provider.name}</h3>
                      <p className="text-sm text-slate-600">{provider.specialty}</p>
                    </div>
                  </div>
                  <Badge className={TYPE_COLORS[provider.type]}>
                    {TYPE_LABELS[provider.type]}
                  </Badge>
                </div>

                {provider.address && (
                  <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{provider.address}</span>
                  </div>
                )}
                {provider.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span dir="ltr">{provider.phone}</span>
                  </div>
                )}
                {provider.notes && (
                  <p className="mt-2 text-xs text-slate-400">{provider.notes}</p>
                )}

                {isApiConnected && (
                  <div className="mt-3 flex gap-1 border-t pt-3">
                    <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => openEdit(provider)}>
                      <Pencil className="h-3.5 w-3.5" />تعديل
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(provider)}>
                      <Trash2 className="h-3.5 w-3.5" />حذف
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "إضافة مقدم خدمة جديد" : "تعديل بيانات مقدم الخدمة"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>الاسم</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: عيادة د. أحمد محمد" />
            </div>
            <div className="space-y-1.5">
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={(v: ProviderType) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_LABELS) as [ProviderType, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>التخصص</Label>
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="باطنة / قلب / عيون..." />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="شارع / حي / مدينة" />
            </div>
            <div className="space-y-1.5">
              <Label>رقم التليفون</Label>
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="أي ملاحظات إضافية" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
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
