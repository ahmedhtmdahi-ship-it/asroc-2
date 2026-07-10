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
import { StatCard } from "@/app/components/StatCard";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth } from "@/app/features/auth/AuthContext";
import { formatDate } from "@/app/lib/format";
import { requestStatusLabels } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";

function requestTypeLabel(request: MedicalRequest) {
  if (request.serviceType === "monthly_treatment") {
    return request.monthlyTreatmentType === "renewal" ? "تجديد علاج شهري" : "علاج شهري جديد";
  }

  return request.requestType === "emergency" ? "كشف طوارئ" : "كشف عادي";
}

export function MedicalHistoryPage() {
  const { user } = useAuth();
  const { requests } = useWorkflow();

  const myRequests = requests
    .filter((request) => {
      return (
        request.employeeId === user?.id ||
        request.financialNumber === user?.financialNumber ||
        request.createdBy === user?.id
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const emergencyRequests = myRequests.filter((request) => request.requestType === "emergency");
  const completedRequests = myRequests.filter((request) =>
    ["completed", "monthly_completed"].includes(request.status)
  );
  const prescriptionRequests = myRequests.filter((request) =>
    ["prescribed", "dispensed", "returned", "completed"].includes(request.status)
  );
  const monthlyRequests = myRequests.filter((request) => request.serviceType === "monthly_treatment");

  return (
    <PageLayout
      title="التاريخ الطبي"
      subtitle="سجل الطلبات الطبية الفعلية للموظف"
      backLink="/employee"
      icon={<HeartPulse className="h-5 w-5" />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="إجمالي الطلبات" value={myRequests.length} color="text-blue-700" />
          <StatCard label="كشوف طوارئ" value={emergencyRequests.length} color="text-red-700" />
          <StatCard label="روشتات/صرف" value={prescriptionRequests.length} color="text-teal-700" />
          <StatCard label="مكتمل" value={completedRequests.length} color="text-orange-700" />
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
                  <Button variant="outline" size="sm">
                    <Download className="ml-2 h-4 w-4" />
                    تصدير
                  </Button>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="relative mb-5">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input className="h-11 pr-10" placeholder="بحث برقم الطلب أو سبب الطلب..." />
                </div>

                {myRequests.length === 0 && (
                  <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                    لا توجد طلبات طبية مسجلة لهذا المستخدم.
                  </div>
                )}

                <div className="space-y-4">
                  {myRequests.map((request) => (
                    <div key={request.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">{request.reason}</h3>
                            <Badge variant="outline">{requestTypeLabel(request)}</Badge>
                            <Badge className="bg-blue-100 text-blue-700">
                              {requestStatusLabels[request.status]}
                            </Badge>
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(request.createdAt)} • {request.id}
                          </p>

                          <div className="mt-4">
                            <p className="mb-2 text-sm font-bold">تفاصيل طبية</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge className="border-teal-100 bg-teal-50 text-teal-700" variant="outline">
                                <Pill className="ml-1 h-3 w-3" />
                                {request.prescriptionId ? request.prescriptionId : "لا توجد روشتة منظمة"}
                              </Badge>
                              {request.doctorDiagnosis && (
                                <Badge className="border-blue-100 bg-blue-50 text-blue-700" variant="outline">
                                  {request.doctorDiagnosis}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="xl:w-40">
                          <div className="rounded-xl border bg-slate-50 p-3 text-center">
                            <CalendarDays className="mx-auto mb-2 h-5 w-5 text-blue-700" />
                            <p className="text-xs text-slate-500">الحالة</p>
                            <p className="font-bold text-slate-900">{requestStatusLabels[request.status]}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeartPulse className="h-5 w-5 text-red-700" />
                  العلاج الشهري
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {monthlyRequests.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">
                    لا توجد طلبات علاج شهري لهذا المستخدم.
                  </div>
                ) : (
                  monthlyRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border bg-slate-50 p-3">
                      <p className="font-bold">{request.reason}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {requestStatusLabels[request.status]}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        آخر تحديث: {formatDate(request.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-purple-700" />
                  ملخص طبي سريع
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                {[
                  ["الاسم", user?.name || "غير محدد"],
                  ["الرقم المالي", user?.financialNumber || "غير محدد"],
                  ["الإدارة", user?.department || "غير محدد"],
                  ["آخر طلب", myRequests[0] ? formatDate(myRequests[0].createdAt) : "لا يوجد"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b pb-3">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </PageLayout>
  );
}

