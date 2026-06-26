import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Heart,
  Landmark,
  Loader2,
  PauseCircle,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useAuth } from "@/app/features/auth/AuthContext";
import { apiClient } from "@/app/services/apiClient";

// ── Types ──────────────────────────────────────────────────────────────
interface Pensioner {
  id: number;
  financial_number: string;
  national_id: string;
  job_title: string;
  type: string;
  phone?: string;
  user?: { name: string; email?: string };
  department?: { name: string };
}

interface FamilyMember {
  id: number;
  name: string;
  national_id: string;
  relation: string;
  birth_date?: string;
  is_active: boolean;
}

interface MonthlyTreatment {
  id: number;
  disease_name: string;
  status: string;
  beneficiary_type: string;
  review_type: string;
  created_at: string;
  employee?: { id: number; name?: string; financial_number?: string };
  doctor?: { name: string };
  medications?: { medicine_name: string; dosage: string }[];
}

interface ExternalReferral {
  id: number;
  specialty: string;
  reason: string;
  status: string;
  created_at: string;
  checkup_request?: {
    employee_name?: string;
    financial_number?: string;
  };
  external_provider?: { name: string; type: string };
}

// ── Helpers ─────────────────────────────────────────────────────────────
const relationLabels: Record<string, string> = {
  spouse: "زوج/زوجة",
  son: "ابن",
  daughter: "ابنة",
  father: "أب",
  mother: "أم",
};

const treatmentStatusLabels: Record<string, string> = {
  active: "نشط",
  paused: "موقوف مؤقتاً",
  modified: "معدّل",
  discontinued: "موقوف نهائياً",
};

const referralStatusLabels: Record<string, string> = {
  pending_approval: "بانتظار الموافقة",
  approved: "مُعتمد",
  rejected: "مرفوض",
};

function LoadingState() {
  return (
    <div className="flex h-48 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p>{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>إعادة المحاولة</Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">
      {message}
    </div>
  );
}

// ── Pensioners Tab ──────────────────────────────────────────────────────
function PensionersTab() {
  const [pensioners, setPensioners] = useState<Pensioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);

  const fetch = () => {
    setLoading(true);
    setError(null);
    apiClient.get("/admin/employees?type=retired&per_page=200")
      .then((res: any) => {
        setPensioners(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((err: any) => setError(err?.message ?? "فشل التحميل"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const viewFamily = (id: number) => {
    setSelectedId(id);
    setFamilyLoading(true);
    apiClient.get(`/admin/employees/${id}/family-members`)
      .then((res: any) => setFamilyMembers(Array.isArray(res?.data) ? res.data : []))
      .catch(() => { toast.error("تعذّر تحميل أفراد الأسرة"); setFamilyMembers([]); })
      .finally(() => setFamilyLoading(false));
  };

  const filtered = pensioners.filter((p) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (p.user?.name ?? "").toLowerCase().includes(term) ||
      p.financial_number.toLowerCase().includes(term) ||
      p.national_id.includes(term)
    );
  });

  const selected = selectedId ? pensioners.find((p) => p.id === selectedId) : null;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetch} />;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-7 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pr-10"
            placeholder="بحث بالاسم أو الرقم المالي أو الرقم القومي..."
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState message="لا يوجد أصحاب معاشات مسجلون" />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-right">الاسم</th>
                    <th className="p-3 text-right">الرقم المالي</th>
                    <th className="p-3 text-right">الإدارة</th>
                    <th className="p-3 text-right">الوظيفة</th>
                    <th className="p-3 text-right">أفراد الأسرة</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      className={`cursor-pointer hover:bg-slate-50 ${selectedId === p.id ? "bg-teal-50" : ""}`}
                      onClick={() => viewFamily(p.id)}
                    >
                      <td className="p-3 font-semibold text-slate-900">{p.user?.name ?? "—"}</td>
                      <td className="p-3 font-mono text-sm">{p.financial_number}</td>
                      <td className="p-3 text-slate-600">{p.department?.name ?? "—"}</td>
                      <td className="p-3 text-slate-600">{p.job_title}</td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); viewFamily(p.id); }}>
                          عرض الأسرة
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <p className="text-center text-xs text-slate-500">إجمالي: {pensioners.length} صاحب معاش</p>
      </div>

      <div className="xl:col-span-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-pink-600" />
              {selected ? `أسرة: ${selected.user?.name ?? ""}` : "أفراد الأسرة"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedId ? (
              <p className="text-center text-sm text-slate-400">اختر صاحب معاش لعرض أفراد أسرته</p>
            ) : familyLoading ? (
              <LoadingState />
            ) : familyMembers.length === 0 ? (
              <EmptyState message="لا يوجد أفراد أسرة مسجلون لهذا الشخص" />
            ) : (
              <div className="space-y-3">
                {familyMembers.map((fm) => (
                  <div key={fm.id} className="flex items-center justify-between rounded-xl border bg-white p-3">
                    <div>
                      <p className="font-semibold text-slate-900">{fm.name}</p>
                      <p className="text-xs text-slate-500">{fm.national_id} • {relationLabels[fm.relation] ?? fm.relation}</p>
                      {fm.birth_date && <p className="text-xs text-slate-400">تاريخ الميلاد: {fm.birth_date}</p>}
                    </div>
                    <Badge className={fm.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {fm.is_active ? "مؤهل" : "منتهى الأهلية"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Monthly Treatments Tab ──────────────────────────────────────────────
function MonthlyTreatmentsTab() {
  const [treatments, setTreatments] = useState<MonthlyTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetch = () => {
    setLoading(true);
    setError(null);
    apiClient.get("/monthly-treatments?beneficiary_type=pensioner&per_page=100")
      .then((res: any) => setTreatments(Array.isArray(res?.data) ? res.data : []))
      .catch((err: any) => setError(err?.message ?? "فشل التحميل"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handlePause = async (id: number) => {
    try {
      await apiClient.post(`/monthly-treatments/${id}/pause`);
      toast.success("تم إيقاف العلاج مؤقتاً");
      fetch();
    } catch { toast.error("تعذّر الإيقاف"); }
  };

  const handleDiscontinue = async (id: number) => {
    if (!window.confirm("إيقاف نهائي؟ لا يمكن التراجع.")) return;
    try {
      await apiClient.post(`/monthly-treatments/${id}/discontinue`);
      toast.success("تم إيقاف العلاج نهائياً");
      fetch();
    } catch { toast.error("تعذّر الإيقاف"); }
  };

  const filtered = treatments.filter((t) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      t.disease_name.toLowerCase().includes(term) ||
      (t.employee?.name ?? "").toLowerCase().includes(term)
    );
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetch} />;
  if (filtered.length === 0) return <EmptyState message="لا توجد علاجات شهرية لأصحاب المعاشات" />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pr-10" placeholder="بحث..." />
      </div>

      <div className="space-y-3">
        {filtered.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{t.employee?.name ?? "غير محدد"}</p>
                    <Badge variant="outline" className="font-mono text-xs">{t.employee?.financial_number ?? ""}</Badge>
                    <Badge className={
                      t.status === "active" ? "bg-teal-100 text-teal-700" :
                      t.status === "paused" ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }>
                      {treatmentStatusLabels[t.status] ?? t.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{t.disease_name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    الطبيب: {t.doctor?.name ?? "غير محدد"} • {(t.medications?.length ?? 0)} دواء
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 xl:flex-col xl:w-44">
                  {t.status === "active" && (
                    <Button variant="outline" size="sm" className="text-orange-700 border-orange-300" onClick={() => handlePause(t.id)}>
                      <PauseCircle className="ml-1 h-4 w-4" />
                      إيقاف مؤقت
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-red-700 border-red-300" disabled={t.status === "discontinued"} onClick={() => handleDiscontinue(t.id)}>
                    إيقاف نهائي
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Referrals Tab ───────────────────────────────────────────────────────
function ReferralsTab() {
  const [referrals, setReferrals] = useState<ExternalReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = () => {
    setLoading(true);
    setError(null);
    apiClient.get("/medical-admin/referrals?per_page=100")
      .then((res: any) => setReferrals(Array.isArray(res?.data) ? res.data : []))
      .catch((err: any) => setError(err?.message ?? "فشل التحميل"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetch} />;
  if (referrals.length === 0) return <EmptyState message="لا توجد تحويلات خارجية حالياً" />;

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-right">الموظف</th>
              <th className="p-3 text-right">التخصص</th>
              <th className="p-3 text-right">الجهة</th>
              <th className="p-3 text-right">الحالة</th>
              <th className="p-3 text-right">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {referrals.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-3 font-semibold">{r.checkup_request?.employee_name ?? "—"}</td>
                <td className="p-3">{r.specialty}</td>
                <td className="p-3 text-slate-600">{r.external_provider?.name ?? "—"}</td>
                <td className="p-3">
                  <Badge className={
                    r.status === "approved" ? "bg-green-100 text-green-700" :
                    r.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }>
                    {referralStatusLabels[r.status] ?? r.status}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-slate-500">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("ar-EG") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export function PensionAdminPage() {
  const { isApiConnected } = useAuth();
  const [stats, setStats] = useState({ pensioners: 0, treatments: 0, referrals: 0 });

  useEffect(() => {
    if (!isApiConnected) return;

    Promise.allSettled([
      apiClient.get("/admin/employees?type=retired&per_page=1"),
      apiClient.get("/monthly-treatments?beneficiary_type=pensioner&per_page=1"),
      apiClient.get("/medical-admin/referrals?per_page=1"),
    ]).then(([p, t, r]) => {
      setStats({
        pensioners: (p.status === "fulfilled" ? (p.value as any)?.meta?.total : 0) ?? 0,
        treatments: (t.status === "fulfilled" ? (t.value as any)?.meta?.total : 0) ?? 0,
        referrals:  (r.status === "fulfilled" ? (r.value as any)?.meta?.total : 0) ?? 0,
      });
    });
  }, [isApiConnected]);

  return (
    <PageLayout
      title="إدارة المعاشات"
      subtitle="أصحاب المعاشات وأفراد أسرهم والعلاجات الشهرية"
      icon={<Landmark className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "أصحاب المعاشات", value: stats.pensioners, color: "text-blue-700" },
          { label: "علاجات شهرية", value: stats.treatments, color: "text-teal-700" },
          { label: "تحويلات خارجية", value: stats.referrals, color: "text-purple-700" },
          { label: "حالة الاتصال", value: isApiConnected ? "متصل" : "غير متصل", color: isApiConnected ? "text-green-700" : "text-red-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <div className={`mb-1 text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-sm text-slate-600">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pensioners" dir="rtl">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="pensioners" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            أصحاب المعاشات
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            العلاج الشهري
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-1.5 text-xs">
            <ArrowUpRight className="h-3.5 w-3.5" />
            التحويلات الخارجية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pensioners">
          <PensionersTab />
        </TabsContent>
        <TabsContent value="monthly">
          <MonthlyTreatmentsTab />
        </TabsContent>
        <TabsContent value="referrals">
          <ReferralsTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
