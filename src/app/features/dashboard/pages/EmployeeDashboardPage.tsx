import { Link } from "react-router";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  HeartPulse,
  HelpCircle,
  Home,
  LogOut,
  Siren,
  User,
  UserCircle,
} from "lucide-react";

import { useNavigate } from "react-router";
import logo from "@/assets/logo.png";
import loginBg from "@/assets/login-bg.png";
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

export function EmployeeDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { requests } = useWorkflow();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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

  const notifications = notificationStore
    .getAll()
    .filter((notification) => notification.userId === user?.id || notification.userId === user?.financialNumber)
    .slice(0, 4);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed right-0 top-0 z-40 hidden h-screen w-72 bg-[#082344] text-white xl:block">
        <div className="flex items-center gap-3 px-6 py-6">
          <img src={logo} className="h-14 w-14 object-contain" />
          <div>
            <p className="text-sm">نظام إدارة الخدمات الطبية</p>
            <h1 className="text-2xl font-bold">ASORC</h1>
          </div>
        </div>

        <nav className="mt-6 space-y-2 px-4">
          {[
            ["الرئيسية", Home, "/employee"],
            ["طلب فحص طبي", FilePlus2, "/employee/requests"],
            ["طلباتي", ClipboardList, "/employee/my-requests"],
            ["التاريخ الطبي", HeartPulse, "/employee/history"],
            ["الإشعارات", Bell, "/employee/notifications"],
            ["الملف الشخصي", UserCircle, "/profile"],
            ["المساعدة والدعم", HelpCircle, "#"],
          ].map(([label, Icon, path], index) => (
            <Link
              key={label as string}
              to={path as string}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-lg transition ${
                index === 0 ? "bg-teal-600" : "hover:bg-white/10"
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="absolute bottom-6 left-4 right-4 flex items-center gap-3 rounded-xl px-4 py-3 text-lg hover:bg-white/10 text-right w-auto"
        >
          <LogOut className="h-6 w-6" />
          تسجيل الخروج
        </button>
      </aside>

      <main className="min-h-screen xl:mr-72">
        <header className="flex min-h-20 items-center justify-between border-b bg-white px-5 xl:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <User className="h-7 w-7 text-slate-600" />
            </div>
            <div>
              <h2 className="font-bold">{user?.name || "مستخدم"}</h2>
              <p className="text-sm text-slate-500">
                {user?.financialNumber || "غير محدد"} • {user?.department || "غير محدد"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <Bell className="h-5 w-5" />
            <ClipboardList className="h-5 w-5" />
          </div>
        </header>

        <section className="space-y-6 p-5 xl:p-8">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <Card className="overflow-hidden xl:col-span-4">
              <div
                className="relative min-h-[220px] bg-cover bg-center"
                style={{ backgroundImage: `url(${loginBg})` }}
              >
                <div className="absolute inset-0 bg-[#082344]/25" />
                <div className="absolute inset-x-0 bottom-8 flex justify-center">
                  <div className="rounded-full bg-white p-5 shadow-xl">
                    <img src={logo} className="h-24 w-24 object-contain" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="xl:col-span-8">
              <CardContent className="flex min-h-[220px] flex-col justify-center gap-6 p-6 xl:p-10">
                <div>
                  <h1 className="text-3xl font-bold xl:text-4xl">
                    مرحباً بك، {user?.name || "مستخدم"}
                  </h1>
                  <p className="mt-3 text-slate-500 xl:text-lg">
                    يمكنك إنشاء طلب طبي ومتابعة حالته من نفس لوحة الموظف.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <InfoBox label="الرقم المالي" value={user?.financialNumber || "غير محدد"} />
                  <InfoBox label="الإدارة" value={user?.department || "غير محدد"} />
                  <InfoBox label="طبيعة العمل" value={user?.workType || "غير محدد"} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard title="طلباتي المفتوحة" value={openRequests.length} subtitle="قيد التشغيل" icon={FilePlus2} />
            <KpiCard title="طلبات مكتملة" value={completedRequests.length} subtitle="من سجلي" icon={CheckCircle2} />
            <KpiCard title="علاج شهري" value={monthlyRequests.length} subtitle="طلب/تجديد" icon={HeartPulse} />
            <KpiCard title="طلبات طارئة" value={emergencyRequests.length} subtitle="أولوية عالية" icon={Siren} danger />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>الإشعارات</span>
                  <Bell className="h-5 w-5 text-slate-500" />
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold">{notification.title}</p>
                      <p className="text-sm text-slate-500">{notification.message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الإجراءات السريعة</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <QuickAction title="طلب فحص عادي" subtitle="إنشاء طلب جديد" icon={HeartPulse} to="/employee/requests" />
                <QuickAction title="طلب طارئ" subtitle="للحالات الطارئة" icon={Siren} to="/employee/requests" danger />
                <QuickAction title="عرض طلباتي" subtitle="متابعة الحالة" icon={ClipboardList} to="/employee/my-requests" />
                <QuickAction title="تاريخي الطبي" subtitle="عرض السجلات" icon={Calendar} to="/employee/history" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>آخر الطلبات</span>
                  <Link to="/employee/my-requests" className="text-sm text-teal-700">
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
                    <div>
                      <p className="font-bold">{request.id}</p>
                      <p className="text-sm text-slate-500">{requestTypeLabel(request)}</p>
                    </div>
                    <div className="text-left">
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
        </section>
      </main>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-center">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
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
  icon: any;
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
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${danger ? "bg-red-100" : "bg-teal-100"}`}>
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
  icon: any;
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