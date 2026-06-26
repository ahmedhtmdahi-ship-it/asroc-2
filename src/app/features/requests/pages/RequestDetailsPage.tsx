import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  ExternalLink,
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
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStatusLabels, type RequestStatus } from "@/app/types/workflow";
import { useAuth } from "@/app/features/auth/AuthContext";
import { apiClient } from "@/app/services/apiClient";

const workflowSteps: Array<{ status: RequestStatus; title: string; actor: string }> = [
  { status: "pending",      title: "إنشاء الطلب",    actor: "الموظف" },
  { status: "approved",     title: "موافقة المدير",  actor: "مدير الإدارة" },
  { status: "checked_out",  title: "تسجيل الخروج",  actor: "الأمن" },
  { status: "in_diagnosis", title: "الكشف الطبي",   actor: "الطبيب" },
  { status: "prescribed",   title: "كتابة الروشتة", actor: "الطبيب" },
  { status: "dispensed",    title: "صرف الروشتة",   actor: "الصيدلية" },
  { status: "returned",     title: "تسجيل العودة",  actor: "الأمن" },
  { status: "completed",    title: "اكتمال الطلب",  actor: "النظام" },
];

const terminalStatuses: RequestStatus[] = ["rejected", "postponed", "cancelled", "monthly_rejected"];

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value || "غير محدد"}</p>
    </div>
  );
}

function StepIcon({ state }: { state: "done" | "current" | "pending" }) {
  if (state === "done")    return <CheckCircle2 className="h-5 w-5 text-teal-600" />;
  if (state === "current") return <Clock className="h-5 w-5 text-blue-700" />;
  return <Circle className="h-5 w-5 text-slate-300" />;
}

function getStepState(
  stepStatus: RequestStatus,
  currentStatus: RequestStatus,
  steps: Array<{ status: RequestStatus }>
): "done" | "current" | "pending" {
  const currentIndex = steps.findIndex((s) => s.status === currentStatus);
  const stepIndex    = steps.findIndex((s) => s.status === stepStatus);
  if (currentIndex === -1 || terminalStatuses.includes(currentStatus)) {
    return stepIndex === 0 ? "done" : "pending";
  }
  if (stepIndex < currentIndex)  return "done";
  if (stepIndex === currentIndex) return "current";
  return "pending";
}

export function RequestDetailsPage() {
  const { id } = useParams();
  const { requests, refreshRequests } = useWorkflow();
  const { user, isApiConnected } = useAuth();
  const myRequestsLink = user?.role === "employee" ? "/employee/my-requests" : "/my-requests";

  const request = requests.find((item) => item.id === id);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!id || !isApiConnected) return;
    apiClient.get(`/employee/requests/${id}`)
      .then((res: any) => setDetail(res?.data ?? res))
      .catch(() => {});
  }, [id, isApiConnected]);

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
            <p className="mt-2 text-sm text-slate-500">قد يكون الطلب غير موجود أو لم يتم إنشاؤه في هذه الجلسة.</p>
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

  const isEmergency = request.requestType === "emergency";
  const requestTypeLabel =
    request.requestType === "emergency" ? "كشف طوارئ" : "كشف طبي عادي";

  const diagnosis      = detail?.diagnosis      ?? null;
  const prescription   = detail?.prescription   ?? null;
  const sickLeave      = detail?.sick_leave      ?? null;
  const referral       = detail?.external_referral ?? null;
  const checkedOutAt   = detail?.checked_out_at  ?? request.checkOutTime;
  const returnedAt     = detail?.returned_at     ?? null;
  const securityOfficer = detail?.security_officer?.name ?? null;

  return (
    <PageLayout
      title="تفاصيل الطلب الطبي"
      subtitle={`${requestTypeLabel} / ${request.id}`}
      backLink={myRequestsLink}
      icon={<FileText className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {/* Header badges + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
              {requestTypeLabel}
            </Badge>
            <Badge className="bg-teal-100 text-teal-700">
              {requestStatusLabels[request.status]}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={refreshRequests}>
              <RefreshCw className="ml-2 h-4 w-4" />
              تحديث
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
          </div>
        </div>

        {/* Employee + Request info */}
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
                <InfoItem label="الرقم المالي"  value={request.financialNumber} />
                <InfoItem label="الإدارة"        value={request.department} />
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
                <InfoItem label="رقم الطلب"    value={request.id} />
                <InfoItem label="تاريخ الإنشاء" value={new Date(request.createdAt).toLocaleString("ar-EG")} />
                <InfoItem label="نوع الطلب"    value={requestTypeLabel} />
                <InfoItem label="حالة الطلب"   value={requestStatusLabels[request.status]} />
              </div>
              {request.notes && (
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">ملاحظات</p>
                  <p className="font-semibold text-slate-900">{request.notes}</p>
                </div>
              )}
              {request.rejectionReason && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="mb-1 text-xs text-red-600">سبب الرفض</p>
                  <p className="font-semibold text-red-900">{request.rejectionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workflow timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-700" />
              خط سير الطلب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
              {workflowSteps.map((step, index) => {
                const state = getStepState(step.status, request.status, workflowSteps);
                return (
                  <div
                    key={step.status}
                    className={`rounded-2xl border p-4 ${
                      state === "current" ? "border-blue-300 bg-blue-50 shadow-sm"
                      : state === "done"  ? "border-teal-200 bg-teal-50"
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

        {/* Medical data */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-red-700" />
                البيانات الطبية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Diagnosis */}
              <div className="rounded-2xl border bg-white p-4">
                <p className="mb-2 text-xs text-slate-500">التشخيص</p>
                {diagnosis ? (
                  <>
                    <p className="font-semibold text-slate-900">{diagnosis.diagnosis_text}</p>
                    {diagnosis.doctor?.name && (
                      <p className="mt-1 text-xs text-slate-400">د. {diagnosis.doctor.name}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400">لم يُسجَّل تشخيص بعد</p>
                )}
              </div>

              {/* Prescription */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-orange-600" />
                  <h3 className="font-bold text-slate-900">الروشتة الطبية</h3>
                </div>
                {prescription?.items?.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="p-2 text-right">الدواء</th>
                          <th className="p-2 text-right">الجرعة</th>
                          <th className="p-2 text-right">المدة</th>
                          <th className="p-2 text-right">متوفر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {prescription.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="p-2 font-semibold">{item.medicine_name}</td>
                            <td className="p-2">{item.dosage}</td>
                            <td className="p-2">{item.duration}</td>
                            <td className="p-2">
                              <Badge variant="outline" className={item.is_available ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}>
                                {item.is_available ? "✓" : "✗"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-slate-400">
                    لا توجد روشتة مسجلة لهذا الطلب حتى الآن
                  </div>
                )}
              </div>

              {/* Sick leave */}
              {sickLeave && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-1 text-xs text-amber-700 font-semibold">راحة مرضية</p>
                  <p className="font-bold text-amber-900">{sickLeave.days_count} أيام — {sickLeave.reason}</p>
                  <p className="mt-1 text-xs text-amber-600">تبدأ: {sickLeave.start_date}</p>
                </div>
              )}

              {/* External referral */}
              {referral && (
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-xs text-purple-700 font-semibold">تحويل خارجي</p>
                      <p className="font-bold text-purple-900">{referral.specialty}</p>
                      <p className="mt-1 text-sm text-purple-700">{referral.reason}</p>
                      {referral.external_provider?.name && (
                        <p className="mt-1 text-xs text-purple-500">إلى: {referral.external_provider.name}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline">{referral.status}</Badge>
                      {referral.pdf_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={referral.pdf_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="ml-1 h-3 w-3" />
                            PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                <InfoItem label="وقت الخروج" value={checkedOutAt ? new Date(checkedOutAt).toLocaleString("ar-EG") : null} />
                <InfoItem label="وقت العودة"  value={returnedAt  ? new Date(returnedAt).toLocaleString("ar-EG")  : null} />
                <InfoItem label="مسؤول الأمن" value={securityOfficer} />
                <InfoItem label="الحالة الحالية" value={requestStatusLabels[request.status]} />
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
                <Button variant="outline" size="sm" onClick={() => window.print()}>طباعة الطلب</Button>
                {prescription && (
                  <Button variant="outline" size="sm" onClick={() => window.print()}>طباعة الروشتة</Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
