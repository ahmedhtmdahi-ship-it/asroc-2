import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  HeartPulse,
  Printer,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth } from "@/app/features/auth/AuthContext";
import { checkupService } from "@/app/services/checkupService";
import { requestStatusLabels } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";
import { toast } from "sonner";

type Referral = {
  id: number;
  status: string;
  specialty: string;
  reason: string;
  notes?: string;
  rejection_reason?: string;
  pdf_path?: string;
  employee_name?: string;
  financial_number?: string;
  external_provider?: { name: string; type: string };
};

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

function ReferralCard({
  referral,
  onApprove,
  onReject,
}: {
  referral: Referral;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const isPending = referral.status === "pending_approval";
  const isApproved = referral.status === "approved";

  return (
    <div className="rounded-2xl border bg-white p-4 transition-all hover:shadow-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">
              {referral.employee_name ?? "—"}
            </span>
            {referral.financial_number && (
              <Badge variant="outline">{referral.financial_number}</Badge>
            )}
            <Badge
              className={
                isPending
                  ? "bg-yellow-100 text-yellow-800"
                  : isApproved
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {isPending ? "بانتظار الموافقة" : isApproved ? "موافق عليه" : "مرفوض"}
            </Badge>
          </div>
          <p className="text-sm text-slate-600">
            <span className="font-medium">التخصص:</span> {referral.specialty}
          </p>
          {referral.external_provider && (
            <p className="text-sm text-slate-600">
              <span className="font-medium">الجهة:</span> {referral.external_provider.name}
            </p>
          )}
          <p className="text-sm text-slate-500">{referral.reason}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isApproved && (
            <Button
              size="sm"
              variant="outline"
              className="border-blue-200 text-blue-700"
              onClick={() => window.open(checkupService.getReferralPdfUrl(referral.id), "_blank")}
            >
              <ExternalLink className="ml-1 h-4 w-4" />
              PDF التحويل
            </Button>
          )}
          {isPending && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onApprove(referral.id)}
              >
                <CheckCircle2 className="ml-1 h-4 w-4" />
                موافقة
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => onReject(referral.id)}
              >
                <X className="ml-1 h-4 w-4" />
                رفض
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function MedicalAdminPage() {
  const { requests } = useWorkflow();
  const { isApiConnected } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);

  const fetchReferrals = () => {
    if (!isApiConnected) return;
    checkupService.getPendingReferrals()
      .then((res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        setReferrals(items);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchReferrals();
  }, [isApiConnected]);

  const handleApprove = async (id: number) => {
    try {
      await checkupService.approveReferral(id);
      toast.success("تمت الموافقة على التحويل");
      fetchReferrals();
    } catch (err) {
      toast.error("تعذرت الموافقة", { description: err instanceof Error ? err.message : "حدث خطأ" });
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt("سبب الرفض:");
    if (!reason) return;
    try {
      await checkupService.rejectReferral(id, reason);
      toast.success("تم رفض التحويل");
      fetchReferrals();
    } catch (err) {
      toast.error("تعذر الرفض", { description: err instanceof Error ? err.message : "حدث خطأ" });
    }
  };

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

  const pendingReferrals = referrals.filter((r) => r.status === "pending_approval");

  const stats = [
    { label: "طلبات اليوم", value: todayRequests.length, icon: Activity, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "حالات طوارئ", value: emergencyRequests.length, icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50" },
    { label: "تحويلات معلقة", value: pendingReferrals.length, icon: FileText, color: "text-orange-700", bg: "bg-orange-50" },
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-700" />
                    التحويلات الخارجية
                  </span>
                  <Badge variant="outline">{referrals.length} تحويل</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referrals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                    {isApiConnected ? "لا توجد تحويلات خارجية حالياً." : "غير متصل بالخادم — تحقق من الاتصال."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referrals.map((ref) => (
                      <ReferralCard
                        key={ref.id}
                        referral={ref}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-blue-700" />
                  ملخص تشغيلي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["كشوف عادية", requests.filter((r) => r.serviceType !== "monthly_treatment" && r.requestType !== "emergency").length],
                  ["كشوف طوارئ", emergencyRequests.length],
                  ["علاج شهري", monthlyRequests.length],
                  ["بانتظار طبيب شهري", pendingMonthly.length],
                  ["تحويلات معلقة", pendingReferrals.length],
                  ["جاهز للصيدلية", requests.filter((r) => ["prescribed", "monthly_ready_pharmacy"].includes(r.status)).length],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between border-b pb-3">
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
