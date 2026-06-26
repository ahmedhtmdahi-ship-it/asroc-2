import { useEffect, useState } from "react";
import {
  Check,
  ClipboardList,
  History,
  Printer,
  Search,
  Store,
  Upload,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { useAuth } from "@/app/features/auth/AuthContext";
import { apiClient } from "@/app/services/apiClient";
import { toast } from "sonner";

type MonthlyTreatment = {
  id: number;
  disease_name: string;
  status: string;
  dispensing_month?: string;
  dispensing_status?: string;
  employee_name?: string;
  financial_number?: string;
  employee?: { name?: string; financial_number?: string };
};

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`mb-1 text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-sm text-slate-600">{label}</div>
      </CardContent>
    </Card>
  );
}

function EmptyExternalData({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <Upload className="h-7 w-7 text-teal-700" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function MonthlyTreatmentTab({
  treatments,
  onDispense,
}: {
  treatments: MonthlyTreatment[];
  onDispense: (id: number) => void;
}) {
  if (treatments.length === 0) {
    return (
      <EmptyExternalData
        title="لا يوجد علاج شهري مستحق الآن"
        description="ستظهر هنا العلاجات الشهرية المستحقة للصرف من الصيدلية الخارجية."
      />
    );
  }

  return (
    <div className="space-y-3">
      {treatments.map((t) => {
        const name = t.employee_name ?? t.employee?.name ?? "غير محدد";
        const fin  = t.financial_number ?? t.employee?.financial_number ?? "—";
        const isPending = t.dispensing_status === "pending" || !t.dispensing_status;
        return (
          <Card key={t.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-1">
                <p className="font-bold text-slate-900">{name}</p>
                <p className="text-sm text-slate-500">الرقم المالي: {fin}</p>
                <p className="text-sm text-slate-600">{t.disease_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={isPending ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                  {isPending ? "في انتظار الصرف" : "تم الصرف"}
                </Badge>
                {isPending && (
                  <Button size="sm" onClick={() => onDispense(t.id)}>
                    <Check className="ml-1 h-4 w-4" />
                    تأكيد الصرف
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

type BeneficiaryResult = {
  id: number;
  name: string;
  financial_number: string;
  national_id: string;
  job_title: string;
  type: string;
  monthly_treatments: Array<{
    id: number;
    disease_name: string;
    medications: Array<{ medicine_name: string; dosage: string }>;
  }>;
};

function DispensingHistoryTab({ isApiConnected }: { isApiConnected: boolean }) {
  const [records, setRecords] = useState<MonthlyTreatment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isApiConnected) return;
    setLoading(true);
    apiClient.get("/external-pharmacy/monthly-treatments?per_page=200")
      .then((res: any) => {
        const all: MonthlyTreatment[] = Array.isArray(res) ? res : (res?.data ?? []);
        setRecords(all.filter((r) => r.dispensing_status === "dispensed"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isApiConnected]);

  if (!isApiConnected) return <Card><CardContent className="p-10 text-center text-slate-500">غير متصل بالخادم.</CardContent></Card>;
  if (loading) return <div className="flex h-40 items-center justify-center text-slate-400">جاري التحميل...</div>;
  if (records.length === 0) return <Card><CardContent className="p-10 text-center text-slate-500">لا يوجد سجل صرف لهذا الشهر.</CardContent></Card>;

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {["المستفيد", "الرقم المالي", "المرض", "الشهر", "الحالة"].map((h) => (
              <th key={h} className="p-3 text-right font-medium text-slate-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="p-3 font-medium">{r.employee_name ?? r.employee?.name ?? "—"}</td>
              <td className="p-3 text-slate-500">{r.financial_number ?? r.employee?.financial_number ?? "—"}</td>
              <td className="p-3 text-slate-600">{r.disease_name}</td>
              <td className="p-3 text-slate-500">{r.dispensing_month ?? "—"}</td>
              <td className="p-3">
                <Badge className="bg-green-100 text-green-700">
                  <Check className="ml-1 h-3 w-3" />تم الصرف
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BeneficiarySearchTab({ isApiConnected }: { isApiConnected: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BeneficiaryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 2) {
      toast.error("أدخل كلمتين على الأقل للبحث");
      return;
    }
    if (!isApiConnected) {
      toast.error("غير متصل بالخادم");
      return;
    }
    setSearching(true);
    setSearched(false);
    try {
      const res: any = await apiClient.get(`/external-pharmacy/search-beneficiary?q=${encodeURIComponent(query.trim())}`);
      setResults(res?.data ?? []);
    } catch (err) {
      toast.error("فشل البحث", { description: err instanceof Error ? err.message : "حدث خطأ" });
      setResults([]);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">البحث عن مستفيد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-11 pr-10"
                placeholder="رقم المعاش أو الرقم القومي أو اسم المستفيد..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              />
            </div>
            <Button className="px-6" onClick={handleSearch} disabled={searching}>
              {searching ? "جاري البحث..." : "بحث"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && results.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            لا توجد نتائج مطابقة للبحث.
          </CardContent>
        </Card>
      )}

      {results.map((b) => (
        <Card key={b.id}>
          <CardContent className="p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{b.name}</h3>
                <p className="text-sm text-slate-500">رقم مالي: {b.financial_number} — رقم قومي: {b.national_id}</p>
                <p className="text-sm text-slate-500">{b.job_title}</p>
              </div>
              <Badge className="bg-purple-100 text-purple-800">{b.type === "retired" ? "معاش" : "موظف"}</Badge>
            </div>
            {b.monthly_treatments.length === 0 ? (
              <p className="text-sm text-slate-400">لا يوجد علاج شهري نشط.</p>
            ) : (
              <div className="space-y-2">
                {b.monthly_treatments.map((t) => (
                  <div key={t.id} className="rounded-xl border bg-slate-50 p-3">
                    <p className="font-semibold text-slate-800">{t.disease_name}</p>
                    <ul className="mt-1 space-y-0.5">
                      {t.medications.map((m, i) => (
                        <li key={i} className="text-sm text-slate-600">
                          {m.medicine_name} — {m.dosage}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ExternalPharmacyPage() {
  const { isApiConnected } = useAuth();
  const [treatments, setTreatments] = useState<MonthlyTreatment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTreatments = () => {
    if (!isApiConnected) return;
    setIsLoading(true);
    apiClient.get("/external-pharmacy/monthly-treatments?per_page=100")
      .then((res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        setTreatments(items);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTreatments();
  }, [isApiConnected]);

  const handleDispense = async (id: number) => {
    try {
      await apiClient.post(`/external-pharmacy/treatments/${id}/dispense`);
      toast.success("تم تأكيد صرف العلاج الشهري");
      fetchTreatments();
    } catch (err) {
      toast.error("تعذر تأكيد الصرف", {
        description: err instanceof Error ? err.message : "حدث خطأ",
      });
    }
  };

  const pendingCount  = treatments.filter((t) => !t.dispensing_status || t.dispensing_status === "pending").length;
  const dispensedToday = treatments.filter((t) => t.dispensing_status === "dispensed").length;

  return (
    <PageLayout
      title="الصيدلية الخارجية"
      subtitle="العلاج الشهري للمعاشات والمستفيدين"
      icon={<Store className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="في انتظار الصرف"  value={String(pendingCount)}   color="text-yellow-700" />
        <StatCard label="تم الصرف اليوم"   value={String(dispensedToday)} color="text-green-700"  />
        <StatCard label="إجمالي الشهر"     value={String(treatments.length)} color="text-purple-700" />
        <StatCard label="الاتصال بالخادم" value={isApiConnected ? "متصل" : "غير متصل"} color={isApiConnected ? "text-green-700" : "text-red-600"} />
      </div>

      <Tabs defaultValue="monthly" dir="rtl">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="monthly" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            العلاج الشهري
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            البحث عن مستفيد
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            سجل الصرف
          </TabsTrigger>
          <TabsTrigger value="receipt" className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            إيصال التأكيد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">جاري التحميل...</div>
          ) : (
            <MonthlyTreatmentTab treatments={treatments} onDispense={handleDispense} />
          )}
        </TabsContent>

        <TabsContent value="search">
          <BeneficiarySearchTab isApiConnected={isApiConnected} />
        </TabsContent>

        <TabsContent value="history">
          <DispensingHistoryTab isApiConnected={isApiConnected} />
        </TabsContent>

        <TabsContent value="receipt">
          <EmptyExternalData
            title="لا يوجد إيصال محدد"
            description="اختر عملية صرف لطباعة الإيصال."
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
