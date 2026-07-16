import { useMemo, useRef, useState, type FormEvent } from "react";import { Link, useLocation } from "react-router";
import { useAuth, getHomePathByRole } from "@/app/features/auth/AuthContext";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { findManagerByDepartment } from "@/app/utils/managerResolver";
import {
  getMonthlyTreatmentDoctorId,
  getMonthlyTreatmentDoctorName,
} from "@/app/utils/monthlyTreatmentResolver";
import type {
  MedicalRequest,
  MonthlyTreatmentType,
  RequestType,
  ServiceType,
} from "@/app/types/request";
import { isClosedStatus, requestStatusLabels, statusBadgeClasses, MONTHLY_CHECKUP_LIMIT } from "@/app/types/workflow";
import { formatDate } from "@/app/lib/format";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Clock,
  FileText,
  Info,
  Paperclip,
  Pill,
  Send,
  Stethoscope,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";

const checkupWorkflowSteps = [
  ["1", "تقديم الطلب", "الموظف يرسل طلب الكشف"],
  ["2", "اعتماد المدير", "موافقة / رفض / تأجيل"],
  ["3", "تسجيل الخروج", "الأمن يسجل خروج الموظف"],
  ["4", "الكشف الطبي", "الطبيب يسجل التشخيص والروشتة"],
  ["5", "الصيدلية", "صرف الأدوية أو تسجيل عدم التوفر"],
  ["6", "تسجيل العودة", "الأمن يسجل عودة الموظف"],
  ["7", "مكتمل", "إغلاق الطلب"],
];

const monthlyTreatmentWorkflowSteps = [
  ["1", "تقديم الطلب", "الموظف يرسل طلب العلاج الشهري"],
  ["2", "مراجعة الطبيب", "دكتور العلاج الشهري يراجع الطلب"],
  ["3", "الموافقة", "اعتماد / رفض / تعديل العلاج"],
  ["4", "الصيدلية", "إرسال الطلب للصيدلية للصرف"],
  ["5", "الصرف", "الصيدلية تصرف العلاج الشهري"],
  ["6", "مكتمل", "إغلاق طلب العلاج الشهري"],
];

function getServiceLabel(request: MedicalRequest) {
  if (request.serviceType === "monthly_treatment") {
    return request.monthlyTreatmentType === "renewal"
      ? "تجديد علاج شهري"
      : "علاج شهري جديد";
  }

  if (request.requestType === "emergency") {
    return "كشف طوارئ";
  }

  return "كشف عادي";
}

export function EmployeeRequestsPage() {
  const [serviceType, setServiceType] = useState<ServiceType>("checkup");
  const [requestType, setRequestType] = useState<RequestType>("normal");
  const [monthlyTreatmentType, setMonthlyTreatmentType] =
    useState<MonthlyTreatmentType>("renewal");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const location = useLocation();
  const { requests, createRequest } = useWorkflow();

  // If accessed from /request/new (non-employee role), backLink goes to user's home
  const isUniversalRoute = location.pathname === "/request/new";
  const backLink = isUniversalRoute ? getHomePathByRole(user?.role) : "/employee";
  // Link to view submitted requests — non-employees go to /employee/my-requests too (shared page)
  const myRequestsLink = "/my-requests";


  const employeeDepartment = user?.department || user?.workPlace || "غير محدد";
  const resolvedManager = findManagerByDepartment(employeeDepartment);

  const monthlyDoctorId = getMonthlyTreatmentDoctorId();
  const monthlyDoctorName = getMonthlyTreatmentDoctorName();

  const employeeRequests = useMemo(() => {
    if (!user) return [];

    return requests
      .filter((request) => {
        return (
          request.employeeId === user.id ||
          request.financialNumber === user.financialNumber
        );
      })
      .sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [requests, user]);

  const hasOpenRequest = employeeRequests.some((request) => {
    return !isClosedStatus(request.status);
  });

  const monthlyLimit = useMemo(() => {
    const now = new Date();

    const used = employeeRequests.filter((request) => {
      const requestDate = new Date(request.createdAt);

      return (
        request.serviceType === "checkup" &&
        request.requestType === "normal" &&
        request.status === "completed" &&
        requestDate.getMonth() === now.getMonth() &&
        requestDate.getFullYear() === now.getFullYear()
      );
    }).length;

    const total = MONTHLY_CHECKUP_LIMIT;

    return {
      total,
      used,
      remaining: Math.max(total - used, 0),
    };
  }, [employeeRequests]);

  const usedPercent = Math.round((monthlyLimit.used / monthlyLimit.total) * 100);
  const recentRequests = employeeRequests.slice(0, 5);

  const currentWorkflowSteps =
    serviceType === "monthly_treatment"
      ? monthlyTreatmentWorkflowSteps
      : checkupWorkflowSteps;

  const responsiblePerson =
    serviceType === "monthly_treatment"
      ? monthlyDoctorName
      : requestType === "emergency"
      ? "لا يحتاج موافقة مدير"
      : resolvedManager?.name || "غير محدد";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    if (!reason.trim()) {
      toast.error("برجاء كتابة سبب الطلب");
      return;
    }

    if (hasOpenRequest) {
      toast.error("لا يمكن إنشاء طلب جديد", {
        description: "يوجد طلب مفتوح بالفعل لم يتم إغلاقه بعد.",
      });
      return;
    }

    if (
      serviceType === "checkup" &&
      requestType === "normal" &&
      monthlyLimit.remaining <= 0
    ) {
      toast.error("تم استهلاك الحد الشهري للكشوفات العادية");
      return;
    }

    if (serviceType === "checkup" && requestType === "normal" && !resolvedManager) {
      toast.error("لم يتم العثور على المدير المسؤول لهذه الإدارة", {
        description: "راجع بيانات الإدارة أو ملف المديرين.",
      });
      return;
    }

    if (serviceType === "monthly_treatment" && !monthlyDoctorId) {
      toast.error("لم يتم العثور على طبيب العلاج الشهري", {
        description: "لا يوجد مستخدم بدور طبيب نشط — راجع الأدوار في ملف المستخدمين.",
      });
      return;
    }

    const now = new Date();

    const request: MedicalRequest = {
      id: `REQ-${now.getFullYear()}-${Date.now()}`,

      employeeId: user.id,
      employeeName: user.name,
      financialNumber: user.financialNumber || user.id,

      department: employeeDepartment,
      jobTitle: user.jobTitle,
      workType: user.workType,
      nationalId: user.nationalId,
      phone: user.phone,

      serviceType,

      requestType: serviceType === "checkup" ? requestType : undefined,

      monthlyTreatmentType:
        serviceType === "monthly_treatment" ? monthlyTreatmentType : undefined,
      monthlyDoctorId:
        serviceType === "monthly_treatment" ? monthlyDoctorId : undefined,
      monthlyDoctorName:
        serviceType === "monthly_treatment" ? monthlyDoctorName : undefined,

      status:
        serviceType === "monthly_treatment"
          ? "pending_monthly_doctor"
          : requestType === "emergency"
          ? "approved"
          : "pending",
      createdAt: now.toISOString(),

      reason: reason.trim(),
      notes: notes.trim(),

      managerId:
        serviceType === "checkup" && requestType === "normal"
          ? resolvedManager?.financialNumber
          : undefined,
      managerName:
        serviceType === "checkup" && requestType === "normal"
          ? resolvedManager?.name
          : undefined,
    };

    // المرفقات بتترفع فعليًا بعد حفظ الطلب (رفع حقيقي للسيرفر — مش مجرد state).
    createRequest(request, attachments);

    toast.success("تم إرسال الطلب بنجاح", {
      description:
        serviceType === "monthly_treatment"
          ? `تم إرسال طلب العلاج الشهري إلى ${monthlyDoctorName} للمراجعة.`
          : requestType === "emergency"
          ? "تم إنشاء طلب طوارئ واعتماده مباشرة وإرساله للأمن."
          : `تم إرسال طلب الكشف إلى ${
              resolvedManager?.name || "المدير المسؤول"
            } للمراجعة.`,
    });

    setServiceType("checkup");
    setRequestType("normal");
    setMonthlyTreatmentType("renewal");
    setReason("");
    setNotes("");
    setAttachments([]);
  };

  return (
    <PageLayout
      title="إنشاء طلب خدمة طبية"
      subtitle="طلب جديد"
      backLink={backLink}
      icon={<ClipboardList className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <aside className="xl:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>بيانات الموظف</span>
                <User className="w-5 h-5 text-blue-700" />
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              {[
                ["الاسم", user?.name || "غير محدد"],
                ["الرقم المالي", user?.financialNumber || "غير محدد"],
                ["الإدارة", employeeDepartment],
                ["الوظيفة", user?.jobTitle || "غير محدد"],
                ["طبيعة العمل", user?.workType || "غير محدد"],
                ["المسؤول عن الطلب", responsiblePerson],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b pb-3 last:border-b-0"
                >
                  <span className="text-slate-500 shrink-0">{label}</span>
                  <span className="font-bold text-slate-900 text-left">
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>الفحوصات الشهرية</span>
                <Info className="w-5 h-5 text-blue-700" />
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(#14b8a6 ${usedPercent}%, #e5e7eb ${usedPercent}% 100%)`,
                    }}
                  />
                  <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-teal-700">
                      {monthlyLimit.remaining}
                    </span>
                    <span className="text-xs text-slate-500">متبقي</span>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="font-bold text-slate-900">المتاح هذا الشهر</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {monthlyLimit.remaining} من {monthlyLimit.total} فحوصات
                  </p>

                  <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    تم استخدام {monthlyLimit.used} فحص مكتمل
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 leading-6">
                كشف الطوارئ والعلاج الشهري لا يتم احتسابهما ضمن حد الكشوفات
                العادية.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>مسار الطلب</span>
                <Stethoscope className="w-5 h-5 text-teal-700" />
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="relative space-y-5">
                <div className="absolute right-4 top-3 bottom-3 w-px bg-slate-200" />

                {currentWorkflowSteps.map((step, index) => (
                  <div key={step[0]} className="relative flex items-start gap-4">
                    <div
                      className={`z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-teal-600 text-white shadow"
                          : "bg-slate-100 text-slate-500 border"
                      }`}
                    >
                      {step[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {step[1]}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{step[2]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="xl:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-700" />
                بيانات الطلب
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label className="text-base font-bold">
                    نوع الخدمة <span className="text-red-600">*</span>
                  </Label>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setServiceType("checkup")}
                      className={`rounded-2xl border p-5 text-right transition ${
                        serviceType === "checkup"
                          ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Stethoscope className="w-6 h-6 text-blue-700" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">طلب كشف طبي</p>
                          <p className="mt-1 text-sm text-slate-500">
                            كشف عادي أو طوارئ حسب حالة الموظف.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setServiceType("monthly_treatment")}
                      className={`rounded-2xl border p-5 text-right transition ${
                        serviceType === "monthly_treatment"
                          ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center">
                          <Pill className="w-6 h-6 text-teal-700" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            طلب صرف علاج شهري
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            يذهب إلى طبيب العلاج الشهري ثم الصيدلية.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {serviceType === "checkup" && (
                  <div>
                    <Label className="text-base font-bold">
                      نوع الكشف <span className="text-red-600">*</span>
                    </Label>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        data-testid="type-normal"
                        onClick={() => setRequestType("normal")}
                        className={`rounded-2xl border p-5 text-right transition ${
                          requestType === "normal"
                            ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-700" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">كشف عادي</p>
                            <p className="mt-1 text-sm text-slate-500">
                              يحتاج موافقة المدير ويُحتسب بعد اكتماله.
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        data-testid="type-emergency"
                        onClick={() => setRequestType("emergency")}
                        className={`rounded-2xl border p-5 text-right transition ${
                          requestType === "emergency"
                            ? "border-red-500 bg-red-50 ring-2 ring-red-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-700" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">كشف طوارئ</p>
                            <p className="mt-1 text-sm text-slate-500">
                              يُعتمد مباشرة ولا يحتاج موافقة المدير.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {serviceType === "monthly_treatment" && (
                  <div>
                    <Label className="text-base font-bold">
                      نوع العلاج الشهري <span className="text-red-600">*</span>
                    </Label>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setMonthlyTreatmentType("renewal")}
                        className={`rounded-2xl border p-5 text-right transition ${
                          monthlyTreatmentType === "renewal"
                            ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-bold text-slate-900">
                          تجديد علاج شهري
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          للمريض الذي لديه علاج شهري سابق.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMonthlyTreatmentType("new")}
                        className={`rounded-2xl border p-5 text-right transition ${
                          monthlyTreatmentType === "new"
                            ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-bold text-slate-900">
                          علاج شهري جديد
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          لفتح علاج شهري جديد بعد مراجعة الطبيب.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {hasOpenRequest && (
                  <div className="flex items-start gap-3 rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                    <AlertTriangle className="w-5 h-5 mt-0.5" />
                    <p>
                      يوجد طلب مفتوح بالفعل لهذا الموظف. يجب إغلاق الطلب الحالي
                      قبل إنشاء طلب جديد.
                    </p>
                  </div>
                )}

                {serviceType === "checkup" &&
                  requestType === "normal" &&
                  !resolvedManager && (
                    <div className="flex items-start gap-3 rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                      <AlertTriangle className="w-5 h-5 mt-0.5" />
                      <p>
                        لم يتم العثور على مدير مسؤول لهذه الإدارة. راجع بيانات
                        الإدارة أو ملف المديرين قبل إرسال الطلب.
                      </p>
                    </div>
                  )}

                {serviceType === "monthly_treatment" && !monthlyDoctorId && (
                  <div className="flex items-start gap-3 rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                    <AlertTriangle className="w-5 h-5 mt-0.5" />
                    <p>
                      لم يتم العثور على طبيب العلاج الشهري. لا يوجد مستخدم بدور
                      طبيب نشط — راجع الأدوار في ملف المستخدمين.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-base font-bold">
                    سبب الطلب <span className="text-red-600">*</span>
                  </Label>
<Textarea
                    data-testid="request-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      serviceType === "monthly_treatment"
                        ? "اكتب سبب طلب العلاج الشهري..."
                        : "اكتب سبب طلب الفحص الطبي..."
                    }
                    rows={5}
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-slate-500 text-left">
                    {reason.length}/500
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-bold">ملاحظات إضافية</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية... (اختياري)"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500 text-left">
                    {notes.length}/500
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-bold">المرفقات</Label>
                  <div
                    className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dropped = Array.from(e.dataTransfer.files).filter(
                        (f) => f.size <= 5 * 1024 * 1024
                      );
                      setAttachments((prev) => [...prev, ...dropped]);
                    }}
                  >
                    <UploadCloud className="mx-auto w-9 h-9 text-blue-700 mb-2" />
                    <p className="font-semibold text-slate-700">
                      اسحب وأفلت الملفات هنا أو
                    </p>
                    <span className="mt-1 text-blue-700 underline text-sm">
                      اختر ملف من جهازك
                    </span>
                    <p className="mt-2 text-xs text-slate-500">
                      الملفات المسموحة: PNG, JPG, PDF - الحد الأقصى 5MB
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,application/pdf"
                    multiple
                    onChange={(e) => {
                      const selected = Array.from(e.target.files ?? []).filter(
                        (f) => f.size <= 5 * 1024 * 1024
                      );
                      setAttachments((prev) => [...prev, ...selected]);
                      e.target.value = "";
                    }}
                  />

                  {attachments.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {attachments.map((file, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{file.name}</span>
                            <span className="text-xs text-slate-400 shrink-0">
                              ({(file.size / 1024).toFixed(0)} KB)
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAttachments((prev) => prev.filter((_, j) => j !== i))
                            }
                            className="mr-2 text-slate-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Paperclip className="w-4 h-4" />
                    يمكن إرفاق روشتة سابقة أو أي مستندات داعمة.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <Button
                    type="submit"
                    data-testid="request-submit"
                    className="h-12 bg-teal-600 hover:bg-teal-700 text-base font-bold"
                  >
                    <Send className="w-4 h-4 ml-2" />
                    إرسال الطلب
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 text-base"
                    onClick={() => {
                      setServiceType("checkup");
                      setRequestType("normal");
                      setMonthlyTreatmentType("renewal");
                      setReason("");
                      setNotes("");
                      setAttachments([]);
                    }}
                  >
                    <X className="w-4 h-4 ml-2" />
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-5 h-5 text-blue-700" />
                آخر الطلبات
              </CardTitle>
            </CardHeader>

            <CardContent>
              {recentRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center text-slate-500">
                  لا توجد طلبات مسجلة حتى الآن.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-right p-3">رقم الطلب</th>
                        <th className="text-right p-3">نوع الطلب</th>
                        <th className="text-right p-3">التاريخ</th>
                        <th className="text-right p-3">الحالة</th>
                        <th className="text-right p-3">الإجراء</th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y">
                      {recentRequests.map((request) => (
                        <tr key={request.id}>
                          <td className="p-3 font-semibold text-blue-700">
                            {request.id}
                          </td>
                          <td className="p-3">{getServiceLabel(request)}</td>
                          <td className="p-3">{formatDate(request.createdAt)}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClasses[request.status]}`}
                            >
                              {requestStatusLabels[request.status]}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/requests/${request.id}`}>
                                عرض
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </PageLayout>
  );
}