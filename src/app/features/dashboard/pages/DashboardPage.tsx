import { Link } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  HeartPulse,
  Pill,
  Shield,
  Stethoscope,
  PlusCircle,
  Users,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { profilesStore } from "@/app/store/profilesStore";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth } from "@/app/features/auth/AuthContext";
import { requestStatusLabels, type RequestStatus } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";
import type { Permission, UserRole } from "@/app/types/user";

const activeStatuses: RequestStatus[] = [
  "pending",
  "approved",
  "checked_out",
  "in_diagnosis",
  "prescribed",
  "dispensed",
  "returned",
  "pending_monthly_doctor",
  "monthly_approved",
  "monthly_modified",
  "monthly_ready_pharmacy",
  "monthly_dispensed",
];

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "غير محدد";

  return date.toLocaleString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function requestKind(request: MedicalRequest) {
  if (request.serviceType === "monthly_treatment") {
    return request.monthlyTreatmentType === "renewal" ? "تجديد علاج شهري" : "علاج شهري جديد";
  }

  return request.requestType === "emergency" ? "كشف طوارئ" : "كشف عادي";
}

function statusBadgeClass(status: RequestStatus) {
  if (["completed", "monthly_completed"].includes(status)) return "bg-green-100 text-green-700";
  if (["rejected", "monthly_rejected", "cancelled"].includes(status)) return "bg-red-100 text-red-700";
  if (["pending", "pending_monthly_doctor", "postponed"].includes(status)) return "bg-yellow-100 text-yellow-700";
  if (["prescribed", "monthly_ready_pharmacy"].includes(status)) return "bg-purple-100 text-purple-700";
  return "bg-blue-100 text-blue-700";
}

type DashboardAction = {
  label: string;
  link: string;
  icon: LucideIcon;
  permission?: Permission;
  roles?: UserRole[];
  color: string;
  bg: string;
};

const dashboardActions: DashboardAction[] = [
  {
    label: "طلب جديد",
    link: "/request/new",
    icon: PlusCircle,
    color: "text-cyan-700",
    bg: "bg-cyan-50",
  },
  {
    label: "طلباتي",
    link: "/my-requests",
    icon: FolderOpen,
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  {
    label: "الإشعارات",
    link: "/employee/notifications",
    icon: Bell,
    roles: ["employee"],
    color: "text-violet-700",
    bg: "bg-violet-50",
  },
  {
    label: "الملف الشخصي",
    link: "/profile",
    icon: Users,
    color: "text-slate-700",
    bg: "bg-slate-100",
  },
  {
    label: "موافقات المدير",
    link: "/manager/approvals",
    icon: Users,
    permission: "approve_request",
    roles: ["manager", "office_manager"],
    color: "text-orange-700",
    bg: "bg-orange-50",
  },
  {
    label: "فحص الطبيب",
    link: "/doctor",
    icon: Stethoscope,
    permission: "diagnose_patient",
    roles: ["doctor"],
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  {
    label: "صيدلية",
    link: "/pharmacy",
    icon: Pill,
    permission: "dispense_prescription",
    roles: ["pharmacy", "medical_admin"],
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
  {
    label: "الإدارة الطبية",
    link: "/medical-admin",
    icon: HeartPulse,
    roles: ["medical_admin"],
    color: "text-teal-700",
    bg: "bg-teal-50",
  },
  {
    label: "إدارة المعاشات",
    link: "/pension-admin",
    icon: Users,
    permission: "manage_pensioners",
    roles: ["pension_admin", "medical_admin"],
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    label: "العلاج الشهري",
    link: "/monthly-treatment",
    icon: HeartPulse,
    permission: "manage_monthly_treatment",
    roles: ["medical_admin", "pension_admin"],
    color: "text-indigo-700",
    bg: "bg-indigo-50",
  },
  {
    label: "إدارة النظام",
    link: "/super-admin",
    icon: Shield,
    permission: "manage_system",
    roles: ["super_admin"],
    color: "text-slate-700",
    bg: "bg-slate-100",
  },
];

function canViewAction(action: DashboardAction, userRole: UserRole, permissions: Permission[]) {
  if (userRole === "super_admin") return true;
  if (action.roles && !action.roles.includes(userRole)) return false;
  return action.permission ? permissions.includes(action.permission) : true;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  link,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  link: string;
}) {
  return (
    <Link to={link}>
      <Card className="h-full transition hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div className="text-left">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function RequestsTable({ requests }: { requests: MedicalRequest[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="p-3 text-right">رقم الطلب</th>
            <th className="p-3 text-right">الموظف</th>
            <th className="p-3 text-right">النوع</th>
            <th className="p-3 text-right">الحالة</th>
            <th className="p-3 text-right">التوقيت</th>
          </tr>
        </thead>
        <tbody className="divide-y bg-white">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-slate-50">
              <td className="p-3 font-mono text-xs">{request.id}</td>
              <td className="p-3">
                <p className="font-semibold text-slate-900">{request.employeeName}</p>
                <p className="text-xs text-slate-500">{request.financialNumber}</p>
              </td>
              <td className="p-3">{requestKind(request)}</td>
              <td className="p-3">
                <Badge className={statusBadgeClass(request.status)}>
                  {requestStatusLabels[request.status]}
                </Badge>
              </td>
              <td className="p-3 text-xs text-slate-500">{formatDateTime(request.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const operationalRoles: UserRole[] = [
  "manager", "office_manager", "security", "doctor",
  "pharmacy", "medical_admin", "pension_admin", "super_admin",
];

const adminRoles: UserRole[] = ["medical_admin", "super_admin"];

export function DashboardPage() {
  const { requests } = useWorkflow();
  const { user } = useAuth();

  const role = user?.role;
  const isOperational = role != null && operationalRoles.includes(role);
  const isAdmin = role != null && adminRoles.includes(role);

  const openRequests = requests.filter((request) => activeStatuses.includes(request.status));
  const todaysRequests = requests.filter((request) => isToday(request.createdAt));
  const emergencyRequests = requests.filter((request) => request.requestType === "emergency");
  const monthlyRequests = requests.filter((request) => request.serviceType === "monthly_treatment");
  const completedRequests = requests.filter((request) =>
    ["completed", "monthly_completed"].includes(request.status)
  );
  const pharmacyQueue = requests.filter((request) =>
    ["prescribed", "monthly_ready_pharmacy"].includes(request.status)
  );
  const outsideCompany = requests.filter((request) =>
    ["checked_out", "in_diagnosis", "prescribed", "dispensed"].includes(request.status)
  );

  const allUsers = isAdmin ? profilesStore.getAll() : [];
  const roleCounts = allUsers.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const statusDistribution = Object.entries(
    requests.reduce<Record<string, number>>((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const availableActions = user
    ? dashboardActions.filter((action) =>
        canViewAction(action, user.role, user.permissions),
      )
    : [];

  return (
    <PageLayout
      title="لوحة التحكم"
      subtitle={isOperational ? "نظرة تشغيلية على الطلبات والمستخدمين والصلاحيات" : "طلباتك وإشعاراتك"}
      icon={<BarChart3 className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {availableActions.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {availableActions.map((action) => (
              <Link key={action.label} to={action.link}>
                <Card className="h-full transition hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.bg}`}>
                        <action.icon className={`h-6 w-6 ${action.color}`} />
                      </div>
                      <div className="text-left">
                        <p className={`text-2xl font-bold ${action.color}`}>{action.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="طلبات مفتوحة" value={openRequests.length} icon={FolderOpen} color="text-cyan-700" bg="bg-cyan-50" link="/my-requests" />
          <StatCard label="مكتمل" value={completedRequests.length} icon={CheckCircle2} color="text-teal-700" bg="bg-teal-50" link="/my-requests" />
          {isOperational && (
            <>
              <StatCard label="طلبات اليوم" value={todaysRequests.length} icon={CalendarCheck} color="text-blue-700" bg="bg-blue-50" link="/reports" />
              <StatCard label="حالات طارئة" value={emergencyRequests.length} icon={AlertTriangle} color="text-red-700" bg="bg-red-50" link="/doctor" />
              <StatCard label="علاج شهري" value={monthlyRequests.length} icon={HeartPulse} color="text-indigo-700" bg="bg-indigo-50" link="/monthly-treatment" />
              <StatCard label="قائمة الصيدلية" value={pharmacyQueue.length} icon={Pill} color="text-purple-700" bg="bg-purple-50" link="/pharmacy" />
              <StatCard label="خارج الشركة" value={outsideCompany.length} icon={Shield} color="text-green-700" bg="bg-green-50" link="/security" />
            </>
          )}
          {isAdmin && (
            <StatCard label="مستخدمون" value={allUsers.length} icon={Users} color="text-orange-700" bg="bg-orange-50" link="/admin" />
          )}
        </div>

        <div className={`grid grid-cols-1 gap-6 ${isAdmin ? "xl:grid-cols-3" : ""}`}>
          <Card className={isAdmin ? "xl:col-span-2" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-700" />
                أحدث الطلبات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                  لا توجد طلبات مسجلة حتى الآن.
                </div>
              ) : (
                <RequestsTable requests={recentRequests} />
              )}
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-700" />
                  توزيع المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["موظفون", roleCounts.employee || 0],
                  ["مديرون", roleCounts.manager || 0],
                  ["أطباء", roleCounts.doctor || 0],
                  ["صيدلية", roleCounts.pharmacy || 0],
                  ["أمن", roleCounts.security || 0],
                  ["إدارة طبية", roleCounts.medical_admin || 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between border-b pb-3">
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className="font-bold text-slate-900">{value}</span>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/admin">فتح إدارة المستخدمين</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {isOperational && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-700" />
                  توزيع حالات الطلبات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusDistribution.map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-xl border bg-white p-3">
                    <Badge className={statusBadgeClass(status as RequestStatus)}>
                      {requestStatusLabels[status as RequestStatus]}
                    </Badge>
                    <span className="font-bold text-slate-900">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-red-700" />
                  تنبيهات تشغيلية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    title: "طلبات بانتظار موافقة المدير",
                    value: requests.filter((request) => request.status === "pending").length,
                    link: "/manager/approvals",
                  },
                  {
                    title: "طلبات جاهزة للكشف",
                    value: requests.filter((request) => request.status === "checked_out").length,
                    link: "/doctor",
                  },
                  {
                    title: "طلبات جاهزة للصرف",
                    value: pharmacyQueue.length,
                    link: "/pharmacy",
                  },
                  {
                    title: "علاج شهري بانتظار الطبيب",
                    value: requests.filter((request) => request.status === "pending_monthly_doctor").length,
                    link: "/monthly-treatment",
                  },
                ].map((item) => (
                  <Link
                    key={item.title}
                    to={item.link}
                    className="flex items-center justify-between rounded-xl border bg-white p-3 transition hover:bg-slate-50"
                  >
                    <span className="text-sm font-semibold text-slate-700">{item.title}</span>
                    <Badge variant="outline">{item.value}</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
