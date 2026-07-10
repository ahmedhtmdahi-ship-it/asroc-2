import { useMemo } from "react";
import { Link, useParams } from "react-router";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  FileText,
  Pill,
  Printer,
  RefreshCw,
  Shield,
  Stethoscope,
  User,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { auditStore } from "@/app/store/auditStore";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStatusLabels, type RequestStatus } from "@/app/types/workflow";
import { useAuth } from "@/app/features/auth/AuthContext";

const workflowSteps: Array<{
  status: RequestStatus;
  title: string;
  actor: string;
}> = [
  { status: "pending", title: "إنشاء الطلب", actor: "الموظف" },
  { status: "approved", title: "موافقة المدير", actor: "مدير الإدارة" },
  { status: "checked_out", title: "تسجيل الخروج", actor: "الأمن" },
  { status: "in_diagnosis", title: "الكشف الطبي", actor: "الطبيب" },
  { status: "prescribed", title: "كتابة الروشتة", actor: "الطبيب" },
  { status: "dispensed", title: "صرف الروشتة", actor: "الصيدلية" },
  { status: "returned", title: "تسجيل العودة", actor: "الأمن" },
  { status: "completed", title: "اكتمال الطلب", actor: "النظام" },
];

const monthlyWorkflowSteps: Array<{
  status: RequestStatus;
  title: string;
  actor: string;
}> = [
  { status: "pending_monthly_doctor", title: "إنشاء طلب العلاج", actor: "الموظف" },
  { status: "monthly_approved", title: "مراجعة الطبيب", actor: "طبيب العلاج الشهري" },
  { status: "monthly_ready_pharmacy", title: "إرسال للصيدلية", actor: "الطبيب" },
  { status: "monthly_dispensed", title: "صرف العلاج", actor: "الصيدلية" },
  { status: "monthly_completed", title: "اكتمال الطلب", actor: "النظام" },
];

const terminalStatuses: RequestStatus[] = [
  "rejected",
  "postponed",
  "cancelled",
  "monthly_rejected",
];

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value || "غير محدد"}</p>
    </div>
  );
}

function StepIcon({ state }: { state: "done" | "current" | "pending" }) {
  if (state === "done") {
    return <CheckCircle2 className="h-5 w-5 text-teal-600" />;
  }

  if (state === "current") {
    return <Clock className="h-5 w-5 text-blue-700" />;
  }

  return <Circle className="h-5 w-5 text-slate-300" />;
}

function getStepState(
  stepStatus: RequestStatus,
  currentStatus: RequestStatus,
  steps: Array<{ status: RequestStatus }>
): "done" | "current" | "pending" {
  const currentIndex = steps.findIndex((step) => step.status === currentStatus);
  const stepIndex = steps.findIndex((step) => step.status === stepStatus);

  if (currentIndex === -1 || terminalStatuses.includes(currentStatus)) {
    return stepIndex === 0 ? "done" : "pending";
  }

  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "current";
  return "pending";
}

export function RequestDetailsPage() {
  const { id } = useParams();
  const { requests, refreshRequests } = useWorkflow();
  const { user } = useAuth();
  // All roles use /my-requests
  const myRequestsLink = "/my-requests";


  const request = requests.find((item) => item.id === id);

  const auditLogs = useMemo(() => {
    return auditStore
      .getAll()
      .filter((log: any) => !id || log.requestId === id)
      .reverse();
  }, [id, requests]);

  if (!request) {
    return (
      <PageLayout
        title="تفاصيل الطلب الطبي"
        subtitle="الطلب غير موجود"
        backLink={myRequestsLink}
        icon={<FileText className="h-5 w-5" />}
      >
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-lg font-bold text-slate-700">لم يتم العثور على الطلب</p>
            <p className="mt-2 text-sm text-slate-500">
              قد يكون الطلب غير موجود أو لم يتم إنشاؤه في هذه الجلسة.
            </p>
            <Button asChild className="mt-5">
              <Link to={myRequestsLink}>
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة إلى طلباتي
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const isMonthlyTreatment = request.serviceType === "monthly_treatment";

  const requestTypeLabel = isMonthlyTreatment
    ? request.monthlyTreatmentType === "renewal"
      ? "تجديد علاج شهري"
      : "علاج شهري جديد"
    : request.requestType === "emergency"
    ? "كشف طوارئ"
    : "كشف طبي عادي";

  const isEmergency = !isMonthlyTreatment && request.requestType === "emergency";
  const activeWorkflowSteps = isMonthlyTreatment ? monthlyWorkflowSteps : workflowSteps;

  return (
    <PageLayout
      title="تفاصيل الطلب الطبي"
      subtitle={`${requestTypeLabel} / ${request.id}`}
      backLink={myRequestsLink}
      icon={<FileText className="h-5 w-5" />}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
              {requestTypeLabel}
            </Badge>
            <Badge className="bg-teal-100 text-teal-700">
              {requestStatusLabels[request.status]}
            </Badge>
            <Badge className="bg-slate-100 text-slate-700">
              {isMonthlyTreatment
                ? "مسار علاج شهري"
                : isEmergency
                ? "أولوية طارئة"
                : "أولوية عادية"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={refreshRequests}>
              <RefreshCw className="ml-2 h-4 w-4" />
              تحديث
            </Button>
            <Button variant="outline" size="sm">
              <Download className="ml-2 h-4 w-4" />
              تصدير PDF
            </Button>
            <Button size="sm">
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-700" />
                بيانات الموظف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-950 font-bold text-white">
                  {request.employeeName.slice(0, 1)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{request.employeeName}</p>
                  <p className="text-sm text-slate-500">{request.department || "غير محدد"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <InfoItem label="الرقم المالي" value={request.financialNumber} />
                <InfoItem label="الإدارة" value={request.department} />
                <InfoItem label="حالة العامل" value="عامل نشط" />
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-700" />
                بيانات الطلب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoItem label="رقم الطلب" value={request.id} />
                <InfoItem
                  label="تاريخ الإنشاء"
                  value={new Date(request.createdAt).toLocaleString("ar-EG")}
                />
                <InfoItem label="نوع الطلب" value={requestTypeLabel} />
                <InfoItem label="حالة الطلب" value={requestStatusLabels[request.status]} />
                <InfoItem label="جهة الاعتماد" value="مدير الإدارة" />
                <InfoItem label="تم الإنشاء بواسطة" value={request.createdBy} />
              </div>

              <div className="rounded-2xl border bg-blue-50 p-4">
                <p className="mb-1 text-xs text-blue-700">سبب الطلب</p>
                <p className="font-semibold text-blue-950">{request.reason}</p>
              </div>

              {request.notes && (
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">ملاحظات</p>
                  <p className="font-semibold text-slate-900">{request.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-700" />
              خط سير الطلب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-1 gap-3 md:grid-cols-3 ${isMonthlyTreatment ? "xl:grid-cols-5" : "xl:grid-cols-8"}`}>
              {activeWorkflowSteps.map((step, index) => {
                const state = getStepState(step.status, request.status, activeWorkflowSteps);
                return (
                  <div
                    key={step.status}
                    className={`rounded-2xl border p-4 ${
                      state === "current"
                        ? "border-blue-300 bg-blue-50 shadow-sm"
                        : state === "done"
                        ? "border-teal-200 bg-teal-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <StepIcon state={state} />
                      <span className="text-xs text-slate-400">{index + 1}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{step.actor}</p>
                  </div>
                );
              })}
            </div>

            {terminalStatuses.includes(request.status) && (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-900">
                الطلب حالته الحالية: {requestStatusLabels[request.status]}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-red-700" />
                البيانات الطبية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border bg-white p-4">
                <p className="mb-2 text-xs text-slate-500">التشخيص</p>
                <p className="font-semibold text-slate-900">
                  سيتم عرض التشخيص النهائي هنا بعد تسجيله من الطبيب.
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-orange-600" />
                  <h3 className="font-bold text-slate-900">الروشتة الطبية</h3>
                </div>

                <div className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">
                  لا توجد روشتة منظمة محفوظة لهذا الطلب حتى الآن. يتم تسجيل انتقال الحالة وملاحظات الطبيب في سجل النشاط لحين ربط نموذج الروشتة التفصيلي.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-700" />
                  بيانات الأمن
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoItem label="وقت الخروج" value="حسب سجل الأمن" />
                <InfoItem label="وقت العودة" value="حسب سجل الأمن" />
                <InfoItem label="الحالة الحالية" value={requestStatusLabels[request.status]} />
                <div className="rounded-2xl border bg-slate-50 p-3 text-xs text-slate-600">
                  الأمن يسجل الخروج والعودة فقط ولا يوافق أو يرفض الطلب.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-slate-700" />
                  إجراءات سريعة
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                <Button variant="outline" size="sm">طباعة الطلب</Button>
                <Button variant="outline" size="sm">طباعة الروشتة</Button>
                <Button variant="outline" size="sm">طباعة إيصال الصرف</Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-700" />
              سجل النشاط
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                لا توجد عمليات مسجلة لهذا الطلب حتى الآن
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-slate-600">
                      <th className="p-3 text-right">الإجراء</th>
                      <th className="p-3 text-right">المستخدم</th>
                      <th className="p-3 text-right">الدور</th>
                      <th className="p-3 text-right">من</th>
                      <th className="p-3 text-right">إلى</th>
                      <th className="p-3 text-right">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id || `${log.requestId}-${log.createdAt}`}>
                        <td className="p-3 font-semibold">{log.action || "تحديث"}</td>
                        <td className="p-3">{log.userName || log.user || "غير محدد"}</td>
                        <td className="p-3">{log.role || "غير محدد"}</td>
                        <td className="p-3">{log.statusBefore || "-"}</td>
                        <td className="p-3">{log.statusAfter || "-"}</td>
                        <td className="p-3 text-xs text-slate-500">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString("ar-EG")
                            : log.time || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}