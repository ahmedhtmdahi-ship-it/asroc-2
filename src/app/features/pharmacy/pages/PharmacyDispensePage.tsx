import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Pill,
  Printer,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStatusLabels } from "@/app/types/workflow";

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value || "غير محدد"}</p>
    </div>
  );
}

export default function PharmacyDispensePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { requests, dispenseRequest, dispenseMonthlyTreatment } = useWorkflow();
  const [confirmedReview, setConfirmedReview] = useState(false);

  const request = requests.find((item) => item.id === id);

  const handleDispense = () => {
    if (!request) return;

    const isMonthlyTreatment = request.status === "monthly_ready_pharmacy";
    const isPrescription = request.status === "prescribed";

    if (!isPrescription && !isMonthlyTreatment) {
      toast.error("لا يمكن صرف هذا الطلب حالياً", {
        description: `الحالة الحالية: ${requestStatusLabels[request.status]}`,
      });
      return;
    }

    if (!confirmedReview) {
      toast.error("راجع بيانات الطلب قبل تأكيد الصرف", {
        description: "يجب تأكيد مراجعة الروشتة أو طلب العلاج الشهري.",
      });
      return;
    }

    if (isMonthlyTreatment) {
      dispenseMonthlyTreatment(request.id, "تم صرف العلاج الشهري من الصيدلية");
    } else {
      dispenseRequest(request.id, "تم صرف الروشتة من الصيدلية الداخلية");
    }

    toast.success("تم الصرف بنجاح", {
      description: isMonthlyTreatment
        ? "تم تسجيل صرف العلاج الشهري."
        : "تم تحويل الطلب إلى مرحلة تسجيل العودة من الأمن.",
    });

    navigate("/pharmacy");
  };

  if (!request) {
    return (
      <PageLayout
        title="صرف الروشتة"
        subtitle="الطلب غير موجود"
        backLink="/pharmacy"
        icon={<Pill className="h-5 w-5" />}
      >
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-lg font-bold text-slate-700">
              لم يتم العثور على الروشتة
            </p>
            <p className="mt-2 text-sm text-slate-500">
              افتح الروشتة من قائمة الوصفات المعلقة داخل الصيدلية.
            </p>
            <Button className="mt-5" onClick={() => navigate("/pharmacy")}>
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للصيدلية
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const isMonthlyTreatment = request.status === "monthly_ready_pharmacy";
  const requestTypeLabel = isMonthlyTreatment
    ? "علاج شهري"
    : request.requestType === "emergency"
    ? "كشف طوارئ"
    : "كشف طبي عادي";

  const canDispense =
    (request.status === "prescribed" ||
      request.status === "monthly_ready_pharmacy") &&
    confirmedReview;

  return (
    <PageLayout
      title="صرف الروشتة"
      subtitle={`${request.employeeName} / ${request.id}`}
      backLink="/pharmacy"
      icon={<Pill className="h-5 w-5" />}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-purple-100 text-purple-700">
              {requestStatusLabels[request.status]}
            </Badge>
            <Badge
              className={
                isMonthlyTreatment
                  ? "bg-teal-100 text-teal-700"
                  : request.requestType === "emergency"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }
            >
              {requestTypeLabel}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/requests/${request.id}`)}
            >
              <FileText className="ml-2 h-4 w-4" />
              تفاصيل الطلب
            </Button>
          </div>
        </div>

        {request.status !== "prescribed" &&
          request.status !== "monthly_ready_pharmacy" && (
            <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-900">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-bold">هذا الطلب ليس في مرحلة الصرف</p>
                <p className="mt-1 text-sm">
                  يمكن الصرف فقط عند مرحلة الروشتة أو العلاج الشهري الجاهز
                  للصيدلية.
                </p>
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-700" />
                بيانات المريض
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoItem label="الاسم" value={request.employeeName} />
              <InfoItem label="الرقم المالي" value={request.financialNumber} />
              <InfoItem label="الإدارة" value={request.department} />
              <InfoItem label="نوع الطلب" value={requestTypeLabel} />
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-teal-700" />
                بيانات الصرف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <InfoItem label="رقم الطلب" value={request.id} />
                <InfoItem
                  label="تاريخ الطلب"
                  value={new Date(request.createdAt).toLocaleString("ar-EG")}
                />
                <InfoItem
                  label="حالة الطلب"
                  value={requestStatusLabels[request.status]}
                />
              </div>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="mb-1 text-xs text-slate-500">سبب الطلب</p>
                <p className="font-semibold text-slate-900">{request.reason}</p>
              </div>

              {request.doctorDiagnosis && (
                <div className="rounded-2xl border bg-white p-4">
                  <p className="mb-1 text-xs text-slate-500">ملاحظات الطبيب</p>
                  <p className="font-semibold text-slate-900">
                    {request.doctorDiagnosis}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-green-700" />
              مراجعة الصرف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={confirmedReview}
                  onCheckedChange={(checked) => setConfirmedReview(Boolean(checked))}
                />
                <div>
                  <p className="font-bold text-slate-900">
                    تم مراجعة بيانات الصرف مع الروشتة أو طلب العلاج الشهري
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    كتالوج الأدوية أصبح متاحاً في لوحة الصيدلية، ويمكن تحديث
                    الرصيد والحد الأدنى من شاشة المخزون.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 p-4">
              <div>
                <p className="font-bold text-slate-900">تأكيد الصرف</p>
                <p className="mt-1 text-sm text-slate-500">
                  {isMonthlyTreatment
                    ? "بعد التأكيد سيتم تسجيل صرف العلاج الشهري."
                    : "بعد التأكيد سيتم تحويل الطلب إلى مرحلة تسجيل العودة من الأمن."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate("/pharmacy")}>
                  إلغاء
                </Button>
                <Button onClick={handleDispense} disabled={!canDispense}>
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                  تأكيد الصرف
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

