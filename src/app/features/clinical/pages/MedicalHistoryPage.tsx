import { useEffect, useState } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  HeartPulse,
  Pill,
  Search,
  Stethoscope,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { useAuth } from "@/app/features/auth/AuthContext";
import { apiClient } from "@/app/services/apiClient";

type ApiRequest = {
  id: number;
  type: "normal" | "emergency";
  status: string;
  notes?: string;
  created_at: string;
  department?: { name?: string };
  diagnosis?: { diagnosis_text?: string };
  prescription?: {
    items?: Array<{ medicine_name: string; dosage: string; duration?: string }>;
  };
  sick_leave?: { days_count: number; reason: string };
};

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار الموافقة",
  approved: "موافق عليه",
  rejected: "مرفوض",
  cancelled: "ملغي",
  postponed: "مؤجل",
  checked_out: "خرج للكشف",
  in_diagnosis: "عند الطبيب",
  prescribed: "تمت الروشتة",
  dispensed: "تم صرف الدواء",
  returned: "عاد من الكشف",
  completed: "مكتمل",
};

function formatDate(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function MedicalHistoryPage() {
  const { user, isApiConnected } = useAuth();
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isApiConnected) return;
    setIsLoading(true);
    apiClient
      .get("/employee/requests?per_page=100")
      .then((res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        setRequests(items);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isApiConnected]);

  const filtered = requests.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      String(r.id).includes(term) ||
      (r.notes ?? "").toLowerCase().includes(term) ||
      (r.diagnosis?.diagnosis_text ?? "").toLowerCase().includes(term)
    );
  });

  const emergencyCount  = requests.filter((r) => r.type === "emergency").length;
  const completedCount  = requests.filter((r) => r.status === "completed").length;
  const prescriptionCount = requests.filter((r) =>
    ["prescribed", "dispensed", "returned", "completed"].includes(r.status)
  ).length;

  return (
    <PageLayout
      title="التاريخ الطبي"
      subtitle="سجل طلباتك الطبية الشخصية"
      backLink="/dashboard"
      icon={<HeartPulse className="h-5 w-5" />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="إجمالي الطلبات"  value={requests.length}    color="text-blue-700"   />
          <StatCard label="كشوف طوارئ"       value={emergencyCount}     color="text-red-700"    />
          <StatCard label="روشتات / صرف"     value={prescriptionCount}  color="text-teal-700"   />
          <StatCard label="مكتمل"            value={completedCount}     color="text-orange-700" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-blue-700" />
                    سجل الطلبات الطبية
                  </span>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="ml-2 h-4 w-4" />
                    تصدير
                  </Button>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="relative mb-5">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="h-11 pr-10"
                    placeholder="بحث برقم الطلب أو الشكوى أو التشخيص..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {isLoading && (
                  <div className="py-10 text-center text-slate-500">جاري التحميل...</div>
                )}

                {!isLoading && !isApiConnected && (
                  <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                    غير متصل بالخادم — لا يمكن عرض التاريخ الطبي.
                  </div>
                )}

                {!isLoading && isApiConnected && filtered.length === 0 && (
                  <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                    {search ? "لا توجد نتائج مطابقة." : "لا توجد طلبات طبية مسجلة حتى الآن."}
                  </div>
                )}

                <div className="space-y-4">
                  {filtered.map((request) => {
                    const isEmergency = request.type === "emergency";
                    const medicines = request.prescription?.items ?? [];
                    return (
                      <div key={request.id} className="rounded-2xl border bg-white p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900">
                                {request.notes || "بدون ملاحظات"}
                              </h3>
                              <Badge variant="outline">
                                {isEmergency ? "كشف طوارئ" : "كشف عادي"}
                              </Badge>
                              <Badge className="bg-blue-100 text-blue-700">
                                {STATUS_LABELS[request.status] ?? request.status}
                              </Badge>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatDate(request.created_at)} • طلب رقم {request.id}
                            </p>

                            {request.diagnosis?.diagnosis_text && (
                              <div className="mt-3 rounded-xl border bg-blue-50 p-3 text-sm">
                                <span className="font-semibold text-blue-800">التشخيص: </span>
                                <span className="text-blue-700">{request.diagnosis.diagnosis_text}</span>
                              </div>
                            )}

                            {medicines.length > 0 && (
                              <div className="mt-3 space-y-1">
                                {medicines.map((m, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                    <Pill className="h-3.5 w-3.5 text-teal-600" />
                                    <span className="font-medium">{m.medicine_name}</span>
                                    <span className="text-slate-400">—</span>
                                    <span>{m.dosage}</span>
                                    {m.duration && <span className="text-slate-400">({m.duration})</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="xl:w-40">
                            <div className="rounded-xl border bg-slate-50 p-3 text-center">
                              <CalendarDays className="mx-auto mb-2 h-5 w-5 text-blue-700" />
                              <p className="text-xs text-slate-500">الحالة</p>
                              <p className="font-bold text-slate-900">
                                {STATUS_LABELS[request.status] ?? request.status}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-purple-700" />
                  ملخص طبي سريع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["الاسم",       user?.name             ?? "غير محدد"],
                  ["الرقم المالي", user?.financialNumber  ?? "غير محدد"],
                  ["الإدارة",     user?.department        ?? "غير محدد"],
                  ["آخر طلب",    requests[0] ? formatDate(requests[0].created_at) : "لا يوجد"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b pb-3">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {requests.some((r) => r.sick_leave) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HeartPulse className="h-5 w-5 text-red-700" />
                    الراحات المرضية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {requests
                    .filter((r) => r.sick_leave)
                    .map((r) => (
                      <div key={r.id} className="rounded-xl border bg-slate-50 p-3 text-sm">
                        <p className="font-bold text-slate-800">{r.sick_leave!.reason}</p>
                        <p className="mt-1 text-slate-500">{r.sick_leave!.days_count} يوم — {formatDate(r.created_at)}</p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </PageLayout>
  );
}
