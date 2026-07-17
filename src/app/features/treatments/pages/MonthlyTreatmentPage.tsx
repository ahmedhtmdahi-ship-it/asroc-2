import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HeartPulse,
  PauseCircle,
  Pill,
  Search,
  User,
  Users,
} from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import { StatCard } from "@/app/components/StatCard";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStore } from "@/app/store/requestStore";
import { formatDate } from "@/app/lib/format";
import { requestStatusLabels } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";
import { toast } from "sonner";

const activeMonthlyStatuses = [
  "monthly_approved",
  "monthly_modified",
  "monthly_ready_pharmacy",
  "monthly_dispensed",
];

function matchesSearch(request: MedicalRequest, searchTerm: string) {
  const term = searchTerm.trim().toLowerCase();

  if (!term) return true;

  return (
    request.id.toLowerCase().includes(term) ||
    request.employeeName.toLowerCase().includes(term) ||
    request.financialNumber.toLowerCase().includes(term) ||
    request.department?.toLowerCase().includes(term)
  );
}

export function MonthlyTreatmentPage() {
  const { requests, moveRequest, refreshRequests } = useWorkflow();

  const [searchTerm, setSearchTerm] = useState("");

  const monthlyRequests = useMemo(() => {
    return requests
      .filter((request) => {
        return (
          request.serviceType === "monthly_treatment" &&
          matchesSearch(request, searchTerm)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, searchTerm]);

  const activeTreatments = monthlyRequests.filter((request) =>
    activeMonthlyStatuses.includes(request.status)
  );

  const pendingRecommendations = monthlyRequests.filter(
    (request) => request.status === "pending_monthly_doctor"
  );

  const readyForPharmacy = monthlyRequests.filter(
    (request) => request.status === "monthly_ready_pharmacy"
  );

  const pausedOrRejected = monthlyRequests.filter((request) =>
    ["monthly_modified", "monthly_rejected", "cancelled"].includes(request.status)
  );

  const handleApprove = async (requestId: string) => {
    // انتقالان متتابعان: monthly_ready_pharmacy لازم يستنّى monthly_approved يتطبّق
    // على السيرفر الأول. لو اتبعتوا معًا (fire-and-forget) ممكن يتسابقوا فالتاني
    // يترفض ويعلق الطلب عند monthly_approved من غير ما يوصل الصيدلية.
    try {
      await requestStore.transitionAsync(requestId, "monthly_approved", "تمت الموافقة على العلاج الشهري");
      await requestStore.transitionAsync(requestId, "monthly_ready_pharmacy", "تم إرسال العلاج الشهري للصيدلية");
      refreshRequests();
      toast.success("تم إرسال العلاج الشهري إلى الصيدلية");
    } catch (error) {
      refreshRequests();
      toast.error("تعذر إرسال العلاج الشهري للصيدلية", {
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      });
    }
  };

  const handleReject = (requestId: string) => {
    moveRequest(requestId, "monthly_rejected", "تم رفض طلب العلاج الشهري");
    toast.success("تم رفض طلب العلاج الشهري");
  };

  const handleDispense = (request: MedicalRequest) => {
    if (request.status === "monthly_ready_pharmacy") {
      moveRequest(request.id, "monthly_dispensed", "تم صرف العلاج الشهري");
      toast.success(`تم صرف العلاج الشهري لـ ${request.employeeName}`);
      return;
    }

    if (request.status === "monthly_dispensed") {
      moveRequest(request.id, "monthly_completed", "تم اكتمال دورة العلاج الشهري");
      toast.success("تم إغلاق دورة العلاج الشهري");
      return;
    }

    toast.error("الحالة ليست جاهزة للصرف حالياً", {
      description: requestStatusLabels[request.status],
    });
  };

  return (
    <PageLayout
      title="إدارة العلاج الشهري"
      subtitle="اعتماد ومتابعة وصرف العلاجات المزمنة"
      icon={<HeartPulse className="w-5 h-5" />}
      backLink="/dashboard"
    >
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-l from-[#0B1F3A] to-[#0D9488] p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">العلاج الشهري مستقل عن طلبات الكشف العادي</p>
              <h2 className="mt-1 text-2xl font-bold">متابعة اعتماد وصرف العلاجات الشهرية</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white/15 text-white border-white/20">مراجعة طبيب</Badge>
              <Badge className="bg-white/15 text-white border-white/20">جاهز للصيدلية</Badge>
              <Badge className="bg-white/15 text-white border-white/20">صرف شهري</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="علاجات نشطة" value={activeTreatments.length} icon={HeartPulse} color="text-teal-700" bg="bg-teal-50" />
          <StatCard label="جاهز للصرف" value={readyForPharmacy.length} icon={Calendar} color="text-blue-700" bg="bg-blue-50" />
          <StatCard label="بانتظار اعتماد" value={pendingRecommendations.length} icon={FileText} color="text-purple-700" bg="bg-purple-50" />
          <StatCard label="موقوف/مرفوض" value={pausedOrRejected.length} icon={PauseCircle} color="text-orange-700" bg="bg-orange-50" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Pill className="w-5 h-5 text-teal-700" />
                    طلبات العلاج الشهري
                  </span>
                  <Badge variant="outline">{monthlyRequests.length} طلب</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="mb-4 flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pr-10 h-11"
                      placeholder="بحث باسم المستفيد أو رقم الطلب..."
                    />
                  </div>
                  <Button variant="outline" className="h-11">تصدير</Button>
                </div>

                <div className="space-y-4">
                  {monthlyRequests.length === 0 && (
                    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                      لا توجد طلبات علاج شهري مطابقة للبحث.
                    </div>
                  )}

                  {monthlyRequests.map((request) => {
                    const canDispense =
                      request.status === "monthly_ready_pharmacy" ||
                      request.status === "monthly_dispensed";

                    return (
                      <div key={request.id} className="rounded-2xl border bg-white p-4 hover:shadow-md transition-all">
                        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                          <div className="flex gap-3">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-teal-50">
                              <User className="w-6 h-6 text-teal-700" />
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-900">{request.employeeName}</h3>
                                <Badge variant="outline">{request.financialNumber}</Badge>
                                <Badge className="bg-teal-100 text-teal-700">
                                  {request.monthlyTreatmentType === "renewal" ? "تجديد" : "طلب جديد"}
                                </Badge>
                                <Badge className="bg-blue-100 text-blue-700">
                                  {requestStatusLabels[request.status]}
                                </Badge>
                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                {request.department || "غير محدد"} • {request.id}
                              </p>

                              <div className="mt-3 rounded-xl bg-purple-50 border border-purple-100 p-3">
                                <p className="text-xs text-purple-700 mb-1">سبب العلاج الشهري</p>
                                <p className="font-semibold text-purple-950">{request.reason}</p>
                              </div>

                              {request.notes && (
                                <div className="mt-3 flex items-start gap-2 rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
                                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                                  <span>{request.notes}</span>
                                </div>
                              )}

                              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="rounded-xl bg-slate-50 p-3">
                                  <p className="text-xs text-slate-500">تاريخ الطلب</p>
                                  <p className="font-semibold">{formatDate(request.createdAt)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                  <p className="text-xs text-slate-500">الطبيب المسؤول</p>
                                  <p className="font-semibold">{request.monthlyDoctorName || "غير محدد"}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                  <p className="text-xs text-slate-500">الحالة</p>
                                  <p className="font-semibold">{requestStatusLabels[request.status]}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="xl:w-48 space-y-2">
                            <Button
                              className="w-full bg-teal-600 hover:bg-teal-700"
                              disabled={!canDispense}
                              data-testid={`monthly-dispense-${request.id}`}
                              onClick={() => handleDispense(request)}
                            >
                              <CheckCircle2 className="w-4 h-4 ml-2" />
                              {request.status === "monthly_dispensed" ? "إغلاق الدورة" : "صرف العلاج"}
                            </Button>
                            <Button variant="outline" className="w-full">عرض السجل</Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="xl:col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-5 h-5 text-blue-700" />
                  توصيات جديدة من الطبيب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingRecommendations.length === 0 && (
                  <div className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">
                    لا توجد توصيات بانتظار الاعتماد.
                  </div>
                )}

                {pendingRecommendations.map((request) => (
                  <div key={request.id} className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{request.employeeName}</p>
                        <p className="text-xs text-slate-500">{request.id}</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700">
                        {requestStatusLabels[request.status]}
                      </Badge>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                      <p className="text-slate-500">سبب الطلب</p>
                      <p className="font-semibold">{request.reason}</p>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      الطبيب المسؤول: {request.monthlyDoctorName || "غير محدد"} • {formatDate(request.createdAt)}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700" data-testid={`monthly-approve-${request.id}`} onClick={() => handleApprove(request.id)}>
                        اعتماد
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(request.id)}>
                        رفض
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-teal-700" />
                  توزيع الحالات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["كل طلبات العلاج", monthlyRequests.length],
                  ["بانتظار طبيب", pendingRecommendations.length],
                  ["جاهز للصيدلية", readyForPharmacy.length],
                  ["تم الصرف", monthlyRequests.filter((request) => request.status === "monthly_dispensed").length],
                  ["مكتمل", monthlyRequests.filter((request) => request.status === "monthly_completed").length],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b pb-3">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-bold text-[#0B1F3A]">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">إجراءات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                <Button variant="outline">تقرير العلاجات المستحقة</Button>
                <Button variant="outline">تقرير الصرف الشهري</Button>
                <Button variant="outline">الحالات الموقوفة</Button>
                <Button variant="outline">تصدير Excel</Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </PageLayout>
  );
}
