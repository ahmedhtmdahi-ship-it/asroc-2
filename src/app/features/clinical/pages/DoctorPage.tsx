import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  Eye,
  FileText,
  Search,
  Stethoscope,
  Users,
  CheckCircle2,
  Pill,
  BedDouble,
  Check,
  XCircle,
} from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth } from "@/app/features/auth/AuthContext";
import { formatDate } from "@/app/lib/format";
import { requestStatusLabels } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";
import { toast } from "sonner";

function formatTime(value?: string) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return date.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchesSearch(request: MedicalRequest, searchTerm: string) {
  const term = searchTerm.trim().toLowerCase();

  if (!term) return true;

  return (
    request.employeeName?.toLowerCase().includes(term) ||
    request.financialNumber?.toLowerCase().includes(term) ||
    request.id?.toLowerCase().includes(term) ||
    request.department?.toLowerCase().includes(term)
  );
}

export function DoctorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { requests, moveRequest } = useWorkflow();

  const [searchTerm, setSearchTerm] = useState("");

  const checkupQueue = useMemo(() => {
    return requests
      .filter((request) => {
        return (
          request.serviceType === "checkup" &&
          request.status === "checked_out" &&
          matchesSearch(request, searchTerm)
        );
      })
      .sort((a, b) => {
        const aEmergency = a.requestType === "emergency" ? 1 : 0;
        const bEmergency = b.requestType === "emergency" ? 1 : 0;

        if (aEmergency !== bEmergency) {
          return bEmergency - aEmergency;
        }

        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
  }, [requests, searchTerm]);

  const monthlyTreatmentQueue = useMemo(() => {
    return requests
      .filter((request) => {
        const isMonthlyTreatment =
          request.serviceType === "monthly_treatment" &&
          request.status === "pending_monthly_doctor";

        const isAssignedToCurrentDoctor =
          !request.monthlyDoctorId ||
          request.monthlyDoctorId === user?.id ||
          request.monthlyDoctorId === user?.financialNumber;

        return (
          isMonthlyTreatment &&
          isAssignedToCurrentDoctor &&
          matchesSearch(request, searchTerm)
        );
      })
      .sort((a, b) => {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
  }, [requests, searchTerm, user]);

  const completedToday = requests.filter((request) => {
    const date = new Date(request.createdAt);
    const today = new Date();

    return (
      request.status === "completed" &&
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }).length;

  const prescriptionsToday = requests.filter((request) => {
    const date = new Date(request.createdAt);
    const today = new Date();

    return (
      request.status === "prescribed" &&
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }).length;

  const stats = [
    {
      label: "قائمة الكشف",
      value: checkupQueue.length.toString(),
      icon: Users,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "العلاج الشهري",
      value: monthlyTreatmentQueue.length.toString(),
      icon: Pill,
      color: "text-teal-700",
      bg: "bg-teal-50",
    },
    {
      label: "تم فحصهم اليوم",
      value: completedToday.toString(),
      icon: CheckCircle2,
      color: "text-green-700",
      bg: "bg-green-50",
    },
    {
      label: "وصفات محررة",
      value: prescriptionsToday.toString(),
      icon: BedDouble,
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
  ];

  const handleStartDiagnosis = (requestId: string) => {
    moveRequest(requestId, "in_diagnosis");
    navigate(`/doctor/diagnosis/${requestId}`);
  };

  const handleApproveMonthlyTreatment = (requestId: string) => {
    moveRequest(requestId, "monthly_approved", "تمت الموافقة على العلاج الشهري");
    moveRequest(
      requestId,
      "monthly_ready_pharmacy",
      "تم إرسال طلب العلاج الشهري إلى الصيدلية"
    );

    toast.success("تمت الموافقة على العلاج الشهري", {
      description: "تم إرسال الطلب إلى الصيدلية للصرف.",
    });
  };

  const handleRejectMonthlyTreatment = (requestId: string) => {
    moveRequest(requestId, "monthly_rejected", "تم رفض طلب العلاج الشهري");

    toast.success("تم رفض طلب العلاج الشهري");
  };

  return (
    <PageLayout
      title="محطة عمل الطبيب"
      subtitle="قائمة انتظار الكشف وطلبات العلاج الشهري"
      icon={<Stethoscope className="w-5 h-5" />}
      backLink="/dashboard"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center`}
                  >
                    <item.icon className={`w-7 h-7 ${item.color}`} />
                  </div>

                  <div className="text-left">
                    <p className={`text-3xl font-bold ${item.color}`}>
                      {item.value}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {item.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-700" />
                البحث في الطلبات
              </CardTitle>

              <div className="flex items-center gap-3">
                <Badge className="bg-blue-100 text-blue-700">
                  {checkupQueue.length} كشف
                </Badge>

                <Badge className="bg-teal-100 text-teal-700">
                  {monthlyTreatmentQueue.length} علاج شهري
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 h-11"
                placeholder="بحث باسم الموظف أو الرقم المالي أو رقم الطلب..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-700" />
                قائمة انتظار الكشف الطبي
              </CardTitle>

              <div className="flex items-center gap-3">
                <Badge className="bg-blue-100 text-blue-700">
                  {checkupQueue.length} مريض في الانتظار
                </Badge>

                <Badge className="bg-red-100 text-red-700">
                  {
                    checkupQueue.filter(
                      (request) => request.requestType === "emergency"
                    ).length
                  }{" "}
                  حالة طوارئ
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {checkupQueue.length === 0 && (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                  لا توجد طلبات جاهزة للكشف حالياً.
                </div>
              )}

              {checkupQueue.map((request, index) => {
                const isEmergency = request.requestType === "emergency";

                return (
                  <Card
                    key={request.id}
                    className={`border-r-4 hover:shadow-md transition ${
                      isEmergency ? "border-r-red-500" : "border-r-blue-500"
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                              isEmergency ? "bg-red-600" : "bg-blue-700"
                            }`}
                          >
                            {index + 1}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-slate-900">
                                {request.employeeName}
                              </h3>

                              <Badge variant="outline">
                                {request.financialNumber}
                              </Badge>

                              <Badge
                                className={
                                  isEmergency
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }
                              >
                                {isEmergency ? "كشف طوارئ" : "كشف عادي"}
                              </Badge>

                              <Badge className="bg-yellow-100 text-yellow-700">
                                {requestStatusLabels[request.status]}
                              </Badge>
                            </div>

                            <p className="text-sm text-slate-500">
                              {request.department || "غير محدد"} • {request.id}
                            </p>

                            <div className="mt-3 rounded-xl bg-slate-50 border p-3 text-sm">
                              <span className="font-semibold text-slate-700">
                                الشكوى:{" "}
                              </span>
                              <span className="text-slate-600">
                                {request.reason}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                وصل: {formatTime(request.createdAt)}
                              </span>

                              <span
                                className={
                                  isEmergency
                                    ? "text-red-600 font-semibold"
                                    : ""
                                }
                              >
                                {requestStatusLabels[request.status]}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/requests/${request.id}`)}
                          >
                            <Eye className="w-4 h-4 ml-2" />
                            ملف المريض
                          </Button>

                          <Button
                            className="bg-teal-600 hover:bg-teal-700"
                            onClick={() => handleStartDiagnosis(request.id)}
                          >
                            <Stethoscope className="w-4 h-4 ml-2" />
                            بدء الكشف
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-700" />
                طلبات العلاج الشهري
              </CardTitle>

              <Badge className="bg-teal-100 text-teal-700">
                {monthlyTreatmentQueue.length} طلب بانتظار المراجعة
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {monthlyTreatmentQueue.length === 0 && (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                  لا توجد طلبات علاج شهري بانتظار مراجعة الطبيب.
                </div>
              )}

              {monthlyTreatmentQueue.map((request, index) => (
                <Card
                  key={request.id}
                  className="border-r-4 border-r-teal-500 hover:shadow-md transition"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-900">
                              {request.employeeName}
                            </h3>

                            <Badge variant="outline">
                              {request.financialNumber}
                            </Badge>

                            <Badge className="bg-teal-100 text-teal-700">
                              {request.monthlyTreatmentType === "new"
                                ? "علاج شهري جديد"
                                : "تجديد علاج شهري"}
                            </Badge>

                            <Badge className="bg-yellow-100 text-yellow-700">
                              {requestStatusLabels[request.status]}
                            </Badge>
                          </div>

                          <p className="text-sm text-slate-500">
                            {request.department || "غير محدد"} • {request.id}
                          </p>

                          <div className="mt-3 rounded-xl bg-slate-50 border p-3 text-sm">
                            <span className="font-semibold text-slate-700">
                              سبب الطلب:{" "}
                            </span>
                            <span className="text-slate-600">
                              {request.reason}
                            </span>
                          </div>

                          {request.notes && (
                            <div className="mt-2 rounded-xl bg-teal-50 border border-teal-100 p-3 text-sm">
                              <span className="font-semibold text-teal-800">
                                ملاحظات:{" "}
                              </span>
                              <span className="text-teal-700">
                                {request.notes}
                              </span>
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              تاريخ الطلب: {formatDate(request.createdAt)}
                            </span>

                            <span>
                              الطبيب المسؤول:{" "}
                              {request.monthlyDoctorName || user?.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/requests/${request.id}`)}
                        >
                          <Eye className="w-4 h-4 ml-2" />
                          عرض
                        </Button>

                        <Button
                          className="bg-teal-600 hover:bg-teal-700"
                          onClick={() =>
                            handleApproveMonthlyTreatment(request.id)
                          }
                        >
                          <Check className="w-4 h-4 ml-2" />
                          موافقة وإرسال للصيدلية
                        </Button>

                        <Button
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => handleRejectMonthlyTreatment(request.id)}
                        >
                          <XCircle className="w-4 h-4 ml-2" />
                          رفض
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3 text-sm text-blue-800 bg-blue-50 rounded-xl">
            <FileText className="w-5 h-5 mt-0.5" />
            <p>
              عند بدء الكشف يتم فتح محطة الطبيب لتسجيل التشخيص والروشتة أو
              التحويل الخارجي. أما طلبات العلاج الشهري فتتم مراجعتها من طبيب
              العلاج الشهري ثم إرسالها للصيدلية للصرف.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}