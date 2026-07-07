import { Link } from "react-router";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  HeartPulse,
  Siren,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth } from "@/app/features/auth/AuthContext";
import { notificationStore } from "@/app/store/notificationStore";
import { requestStatusLabels, type RequestStatus } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";

function statusBadgeClass(status: RequestStatus) {
  if (["completed", "monthly_completed"].includes(status)) return "bg-green-100 text-green-700";
  if (["rejected", "monthly_rejected", "cancelled"].includes(status)) return "bg-red-100 text-red-700";
  if (["pending", "pending_monthly_doctor", "postponed"].includes(status)) return "bg-yellow-100 text-yellow-700";
  return "bg-blue-100 text-blue-700";
}

function requestTypeLabel(request: MedicalRequest) {
  if (request.serviceType === "monthly_treatment") {
    return request.monthlyTreatmentType === "renewal" ? "تجديد علاج شهري" : "علاج شهري جديد";
  }
  return request.requestType === "emergency" ? "كشف طوارئ" : "كشف عادي";
}

function formatDate(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  danger,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="font-bold">{title}</p>
          <p className={`mt-3 text-4xl font-bold ${danger ? "text-red-600" : "text-teal-700"}`}>
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${danger ? "bg-red-100" : "bg-teal-100"}`}>
          <Icon className={`h-7 w-7 ${danger ? "text-red-600" : "text-teal-700"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  title,
  subtitle,
  icon: Icon,
  to,
  danger,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  danger?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`rounded-xl p-4 transition hover:shadow-sm ${
        danger ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800"
      }`}
    >
      <Icon className="mb-3 h-7 w-7" />
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm opacity-80">{subtitle}</p>
    </Link>
  );
}

export function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { requests } = useWorkflow();

  // ✅ فلترة طلبات الموظف الحالي فقط
  const myRequests = requests
    .filter((request) => {
      return (
        request.employeeId === user?.id ||
        request.financialNumber === user?.financialNumber ||
        request.createdBy === user?.id
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const openRequests = myRequests.filter(
    (request) => !["completed", "monthly_completed", "rejected", "monthly_rejected", "cancelled"].includes(request.status)
  );
  const completedRequests = myRequests.filter((request) =>
    ["completed", "monthly_completed"].includes(request.status)
  );
  const emergencyRequests = myRequests.filter((request) => request.requestType === "emergency");
  const monthlyRequests = myRequests.filter((request) => request.serviceType === "monthly_treatment");

  // ✅ إشعارات الموظف الحالي فقط
  const notifications = notificationStore
    .getAll()
    .filter((notification) => notification.userId === user?.id || notification.userId === user?.financialNumber)
    .slice(0, 4);

  return (
    <PageLayout
      title="الرئيسية"
      subtitle={`مرحباً بك، ${user?.name || "مستخدم"}`}
      icon={<ClipboardList className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {/* معلومات الموظف */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">الرقم المالي</p>
                <p className="mt-1 font-bold">{user?.financialNumber || "غير محدد"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">الإدارة</p>
                <p className="mt-1 font-bold">{user?.department || "غير محدد"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">طبيعة العمل</p>
                <p className="mt-1 font-bold">{user?.workType || "غير محدد"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard title="طلباتي المفتوحة" value={openRequests.length} subtitle="قيد التشغيل" icon={FilePlus2} />
          <KpiCard title="طلبات مكتملة" value={completedRequests.length} subtitle="من سجلي" icon={CheckCircle2} />
          <KpiCard title="علاج شهري" value={monthlyRequests.length} subtitle="طلب/تجديد" icon={HeartPulse} />
          <KpiCard title="طلبات طارئة" value={emergencyRequests.length} subtitle="أولوية عالية" icon={Siren} danger />
        </div>

        {/* الإشعارات + الإجراءات السريعة + آخر الطلبات */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* الإشعارات */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>الإشعارات</span>
                <Link to="/notifications" className="text-sm text-teal-700">
                  عرض الكل
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                  لا توجد إشعارات جديدة.
                </div>
              )}

              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 border-b pb-4 last:border-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold">{notification.title}</p>
                    <p className="text-sm text-slate-500">{notification.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* الإجراءات السريعة */}
          <Card>
            <CardHeader>
              <CardTitle>الإجراءات السريعة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* ✅ روابط مصححة */}
              <QuickAction title="طلب فحص عادي" subtitle="إنشاء طلب جديد" icon={HeartPulse} to="/request/new" />
              <QuickAction title="طلب طارئ" subtitle="للحالات الطارئة" icon={Siren} to="/request/new" danger />
              <QuickAction title="عرض طلباتي" subtitle="متابعة الحالة" icon={ClipboardList} to="/my-requests" />
              <QuickAction title="تاريخي الطبي" subtitle="عرض السجلات" icon={Calendar} to="/employee/history" />
            </CardContent>
          </Card>

          {/* آخر الطلبات */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>آخر الطلبات</span>
                <Link to="/my-requests" className="text-sm text-teal-700">
                  عرض الكل
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myRequests.slice(0, 5).length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                  لم يتم إنشاء طلبات بعد.
                </div>
              )}

              {myRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="font-bold">{request.id}</p>
                    <p className="text-sm text-slate-500">{requestTypeLabel(request)}</p>
                  </div>
                  {/* ✅ حذف text-left */}
                  <div className="shrink-0">
                    <p className="text-sm text-slate-500">{formatDate(request.createdAt)}</p>
                    <Badge className={statusBadgeClass(request.status)}>
                      {requestStatusLabels[request.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}