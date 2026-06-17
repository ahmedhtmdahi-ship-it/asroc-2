import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Printer,
  Search,
  TrendingUp,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStatusLabels } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";

function StatCard({ item }: { item: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg}`}>
            <item.icon className={`h-7 w-7 ${item.color}`} />
          </div>
          <div className="text-left">
            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            <p className="mt-1 text-sm text-slate-500">{item.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestSummaryCard({ request }: { request: MedicalRequest }) {
  return (
    <div className="rounded-2xl border bg-white p-4 transition-all hover:shadow-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-700" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900">{request.employeeName}</h3>
              <Badge variant="outline">{request.financialNumber}</Badge>
              <Badge className="bg-red-100 text-red-700">طوارئ</Badge>
              <Badge className="bg-blue-100 text-blue-700">
                {requestStatusLabels[request.status]}
              </Badge>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {request.department || "غير محدد"} • {request.id}
            </p>

            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="mb-1 text-xs text-red-700">سبب الطلب</p>
              <p className="text-sm font-medium text-red-950">{request.reason}</p>
            </div>
          </div>
        </div>

        <Button variant="outline" className="border-blue-200 text-blue-700">
          <Printer className="ml-2 h-4 w-4" />
          طباعة ملخص
        </Button>
      </div>
    </div>
  );
}

export function MedicalAdminPage() {
  const { requests } = useWorkflow();

  const today = new Date();
  const todayRequests = requests.filter((request) => {
    const date = new Date(request.createdAt);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  });

  const emergencyRequests = requests.filter((request) => request.requestType === "emergency");
  const completedRequests = requests.filter((request) =>
    ["completed", "monthly_completed"].includes(request.status)
  );
  const monthlyRequests = requests.filter((request) => request.serviceType === "monthly_treatment");
  const pendingMonthly = requests.filter((request) => request.status === "pending_monthly_doctor");

  const stats = [
    { label: "طلبات اليوم", value: todayRequests.length, icon: Activity, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "حالات طوارئ", value: emergencyRequests.length, icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50" },
    { label: "علاج شهري", value: monthlyRequests.length, icon: HeartPulse, color: "text-purple-700", bg: "bg-purple-50" },
    { label: "عمليات مكتملة", value: completedRequests.length, icon: CheckCircle2, color: "text-teal-700", bg: "bg-teal-50" },
  ];

  return (
    <PageLayout
      title="الإدارة الطبية"
      subtitle="متابعة الحالات الطبية والقرارات الرسمية"
      icon={<HeartPulse className="h-5 w-5" />}
      backLink="/dashboard"
    >
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-l from-[#0B1F3A] to-[#0D9488] p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">لوحة الإدارة الطبية</p>
              <h2 className="mt-1 text-2xl font-bold">مراجعة ومتابعة الطلبات الطبية الفعلية</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/20 bg-white/15 text-white">طلبات فعلية</Badge>
              <Badge className="border-white/20 bg-white/15 text-white">تقارير</Badge>
              <Badge className="border-white/20 bg-white/15 text-white">مراجعة طبية</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.label} item={item} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-700" />
                    حالات الطوارئ
                  </span>
                  <Badge variant="outline">{emergencyRequests.length} حالة</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="mb-4 flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input className="h-11 pr-10" placeholder="بحث باسم الموظف أو رقم الطلب..." />
                  </div>
                  <Button variant="outline" className="h-11">تصدير القائمة</Button>
                </div>

                <div className="space-y-4">
                  {emergencyRequests.length === 0 && (
                    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                      لا توجد حالات طوارئ مسجلة.
                    </div>
                  )}

                  {emergencyRequests.map((request) => (
                    <RequestSummaryCard key={request.id} request={request} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-purple-700" />
                  التحويلات الخارجية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">
                  لا يوجد ملف تحويلات خارجي مرفوع حتى الآن. عند توفر شيت أو API للتحويلات سيتم ربط هذه القائمة بالبيانات الحقيقية.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-blue-700" />
                  ملخص تشغيلي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["كشوف عادية", requests.filter((request) => request.serviceType !== "monthly_treatment" && request.requestType !== "emergency").length],
                  ["كشوف طوارئ", emergencyRequests.length],
                  ["علاج شهري", monthlyRequests.length],
                  ["بانتظار طبيب شهري", pendingMonthly.length],
                  ["جاهز للصيدلية", requests.filter((request) => ["prescribed", "monthly_ready_pharmacy"].includes(request.status)).length],
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-5 w-5 text-teal-700" />
                  إجراءات سريعة
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                <Button variant="outline">تصدير تقرير اليوم</Button>
                <Button variant="outline">طباعة سجل الطوارئ</Button>
                <Button variant="outline">فتح سجل التدقيق</Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </PageLayout>
  );
}
