import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageCheck,
  PackageX,
  Pill,
  Printer,
  RefreshCw,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { medicineStore } from "@/app/store/medicineStore";
import { useStore } from "@/app/store/reactiveStore";
import { requestStatusLabels } from "@/app/types/workflow";
import type { PrescriptionMedication } from "@/app/types/request";

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value || "غير محدد"}</p>
    </div>
  );
}

type MedItem = ReturnType<typeof medicineStore.getAll>[number];

function findAlternatives(med: PrescriptionMedication, count = 3): MedItem[] {
  const allMeds = medicineStore.getAll().filter((m: MedItem) => m.isActive);
  const nameLower = med.name.trim().toLowerCase();

  const words = nameLower.split(" ").slice(0, 2);
  const byPrefix = allMeds.filter((m: MedItem) => {
    const n = m.name.toLowerCase();
    return m.id !== med.id && words.some((w: string) => w.length > 3 && n.includes(w));
  });

  if (byPrefix.length >= count) return byPrefix.slice(0, count);

  const byCategory = allMeds.filter(
    (m: MedItem) =>
      m.id !== med.id &&
      m.category &&
      med.name.toLowerCase().includes((m.category as string).toLowerCase().split(" ")[0])
  );

  const combined = [...new Map([...byPrefix, ...byCategory].map((m: MedItem) => [m.id, m])).values()];
  return combined.slice(0, count);
}

function MedicationRow({
  med,
  unavailable,
  onToggleUnavailable,
}: {
  med: PrescriptionMedication;
  unavailable: boolean;
  onToggleUnavailable: () => void;
}) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const alternatives = unavailable ? findAlternatives(med) : [];

  return (
    <div className={`rounded-xl border p-4 transition ${unavailable ? "border-red-200 bg-red-50/40" : "bg-white"}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${unavailable ? "bg-red-100" : "bg-purple-50"}`}>
            <Pill className={`h-4 w-4 ${unavailable ? "text-red-600" : "text-purple-700"}`} />
          </div>
          <div>
            <p className={`font-bold ${unavailable ? "line-through text-slate-400" : "text-slate-900"}`}>
              {med.name}
            </p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
              {med.dosage && <span>الجرعة: <strong>{med.dosage}</strong></span>}
              {med.duration && <span>المدة: <strong>{med.duration}</strong></span>}
              {med.instructions && <span>التعليمات: <strong>{med.instructions}</strong></span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {unavailable && alternatives.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="border-blue-200 text-blue-700"
              onClick={() => setShowAlternatives((v) => !v)}
            >
              <RefreshCw className="ml-1.5 h-3.5 w-3.5" />
              {showAlternatives ? "إخفاء البدائل" : `بدائل (${alternatives.length})`}
            </Button>
          )}
          <Button
            size="sm"
            variant={unavailable ? "outline" : "ghost"}
            className={unavailable ? "border-green-200 text-green-700" : "text-red-600 hover:bg-red-50"}
            onClick={onToggleUnavailable}
          >
            {unavailable ? (
              <><CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />متوفر</>
            ) : (
              <><PackageX className="ml-1.5 h-3.5 w-3.5" />غير متوفر</>
            )}
          </Button>
        </div>
      </div>

      {unavailable && showAlternatives && alternatives.length > 0 && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-bold text-blue-800">أدوية بديلة مقترحة:</p>
          <div className="space-y-2">
            {alternatives.map((alt: MedItem) => (
              <div key={alt.id} className="flex items-center justify-between rounded-lg bg-white border px-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">{alt.name}</span>
                <div className="flex items-center gap-2">
                  {alt.category && (
                    <Badge variant="outline" className="text-xs">{alt.category}</Badge>
                  )}
                  {typeof alt.currentStock === "number" && (
                    <Badge className={alt.currentStock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {alt.currentStock > 0 ? `${alt.currentStock} وحدة` : "نفد"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unavailable && alternatives.length === 0 && (
        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
          لا توجد بدائل مقترحة في قاعدة الأدوية لهذا الصنف.
        </div>
      )}
    </div>
  );
}

export default function PharmacyDispensePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { requests, moveRequest } = useWorkflow();
  useStore(medicineStore, (s) => s.getAll()); // اشتراك تفاعلي في قائمة الأدوية
  // تحميل الكتالوج كسول — لو المستخدم فتح صفحة الصرف مباشرة (deep link).
  useEffect(() => {
    void medicineStore.ensureLoaded();
  }, []);
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [unavailableMeds, setUnavailableMeds] = useState<Set<string>>(new Set());

  const request = requests.find((item) => item.id === id);

  const toggleUnavailable = (medId: string) => {
    setUnavailableMeds((prev) => {
      const next = new Set(prev);
      if (next.has(medId)) next.delete(medId);
      else next.add(medId);
      return next;
    });
  };

  const handleDispense = () => {
    if (!request) return;

    const isMonthly = request.status === "monthly_ready_pharmacy";
    const isPrescribed = request.status === "prescribed";

    if (!isPrescribed && !isMonthly) {
      toast.error("لا يمكن صرف هذا الطلب حالياً", {
        description: `الحالة الحالية: ${requestStatusLabels[request.status]}`,
      });
      return;
    }

    if (!confirmedReview) {
      toast.error("راجع بيانات الطلب قبل تأكيد الصرف");
      return;
    }

    if (unavailableMeds.size > 0 && request.medications) {
      const unavailableNames = request.medications
        .filter((m: PrescriptionMedication) => unavailableMeds.has(m.id))
        .map((m: PrescriptionMedication) => m.name)
        .join("، ");
      toast.warning(`تنبيه: بعض الأدوية غير متوفرة (${unavailableNames})`);
    }

    if (isMonthly) {
      moveRequest(request.id, "monthly_dispensed", "تم صرف العلاج الشهري من الصيدلية");
    } else {
      moveRequest(request.id, "dispensed", "تم صرف الروشتة من الصيدلية الداخلية");
    }

    toast.success("تم الصرف بنجاح", {
      description: isMonthly
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
            <p className="text-lg font-bold text-slate-700">لم يتم العثور على الروشتة</p>
            <p className="mt-2 text-sm text-slate-500">افتح الروشتة من قائمة الوصفات المعلقة داخل الصيدلية.</p>
            <Button className="mt-5" onClick={() => navigate("/pharmacy")}>
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للصيدلية
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const isMonthly = request.status === "monthly_ready_pharmacy";
  const requestTypeLabel = isMonthly
    ? "علاج شهري"
    : request.requestType === "emergency"
    ? "كشف طوارئ"
    : "كشف طبي عادي";

  const canDispense =
    (request.status === "prescribed" || request.status === "monthly_ready_pharmacy") &&
    confirmedReview;

  const meds = request.medications || [];
  const unavailableCount = unavailableMeds.size;

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
            <Badge className="bg-purple-100 text-purple-700">{requestStatusLabels[request.status]}</Badge>
            <Badge className={isMonthly ? "bg-teal-100 text-teal-700" : request.requestType === "emergency" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
              {requestTypeLabel}
            </Badge>
            {unavailableCount > 0 && (
              <Badge className="bg-red-100 text-red-700">
                <PackageX className="ml-1 h-3 w-3" />
                {unavailableCount} دواء غير متوفر
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/requests/${request.id}`)}>
              <FileText className="ml-2 h-4 w-4" />
              تفاصيل الطلب
            </Button>
          </div>
        </div>

        {request.status !== "prescribed" && request.status !== "monthly_ready_pharmacy" && (
          <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-bold">هذا الطلب ليس في مرحلة الصرف</p>
              <p className="mt-1 text-sm">يمكن الصرف فقط عند مرحلة الروشتة أو العلاج الشهري الجاهز للصيدلية.</p>
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
                <InfoItem label="تاريخ الطلب" value={new Date(request.createdAt).toLocaleString("ar-EG")} />
                <InfoItem label="حالة الطلب" value={requestStatusLabels[request.status]} />
              </div>

              {request.doctorDiagnosis && (
                <div className="rounded-xl border bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-500">التشخيص</p>
                  <p className="font-semibold text-slate-900">{request.doctorDiagnosis}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {meds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-purple-700" />
                  الأدوية الموصوفة
                </span>
                <Badge variant="outline">{meds.length} دواء</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                اضغط "غير متوفر" لأي دواء لتسجيله وعرض البدائل المتاحة.
              </p>
              {meds.map((med: PrescriptionMedication) => (
                <MedicationRow
                  key={med.id}
                  med={med}
                  unavailable={unavailableMeds.has(med.id)}
                  onToggleUnavailable={() => toggleUnavailable(med.id)}
                />
              ))}
            </CardContent>
          </Card>
        )}

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
                  onCheckedChange={(checked: boolean | "indeterminate") => setConfirmedReview(Boolean(checked))}
                />
                <div>
                  <p className="font-bold text-slate-900">تم مراجعة بيانات الصرف مع الروشتة</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {meds.length > 0
                      ? `تأكيد صرف ${meds.length - unavailableCount} دواء من أصل ${meds.length}`
                      : "تأكيد مراجعة الروشتة أو طلب العلاج الشهري"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 p-4">
              <div>
                <p className="font-bold text-slate-900">تأكيد الصرف</p>
                <p className="mt-1 text-sm text-slate-500">
                  {isMonthly
                    ? "بعد التأكيد سيتم تسجيل صرف العلاج الشهري."
                    : "بعد التأكيد سيتم تحويل الطلب إلى مرحلة تسجيل العودة من الأمن."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate("/pharmacy")}>إلغاء</Button>
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
