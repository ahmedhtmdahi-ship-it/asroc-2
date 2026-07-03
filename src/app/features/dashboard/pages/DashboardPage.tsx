import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FilePlus2,
  FolderOpen,
  HeartPulse,
  Pill,
  Shield,
  Siren,
  Stethoscope,
  UserCircle,
  Users,
} from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AppShell } from "@/app/layout/AppShell";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth } from "@/app/features/auth/AuthContext";
import { apiClient } from "@/app/services/apiClient";
import { requestStatusLabels, type RequestStatus } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";
import type { UserRole } from "@/app/types/user";

/* ── مساعدات ─────────────────────────────────────────── */

const CLOSED = [
  "completed", "monthly_completed", "rejected", "monthly_rejected", "cancelled",
] as RequestStatus[];

function statusBadgeClass(status: RequestStatus) {
  if (["completed", "monthly_completed", "dispensed", "returned"].includes(status)) return "bg-green-100 text-green-700";
  if (["rejected", "monthly_rejected", "cancelled"].includes(status)) return "bg-red-100 text-red-700";
  if (["pending", "pending_monthly_doctor", "postponed"].includes(status)) return "bg-yellow-100 text-yellow-700";
  return "bg-blue-100 text-blue-700";
}

function isToday(value?: string) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-EG", { month: "2-digit", day: "2-digit" });
}

/* ── الداشبورد الموحّدة — صفحة واحدة لكل الأدوار ───────── */

export function DashboardPage() {
  const { user } = useAuth();
  const { requests } = useWorkflow();
  const role = (user?.role ?? "employee") as UserRole;

  const isManager = role === "manager" || role === "office_manager";
  const isDoctor = role === "doctor";
  const isPharmacy = role === "pharmacy";
  const isSecurity = role === "security";
  const isSuper = role === "super_admin";
  // مدير الطبية = يشوف الكل + بياخد قرار + بيشوف الصيدلية. السوبر فوقه.
  const isMedicalAdmin = role === "medical_admin";
  const isOversight = isMedicalAdmin || isSuper;

  // الموظف يشوف طلباته هو — الأدوار الإشرافية تشوف كل المرئي ليها
  const myRequests = useMemo(() => {
    const mine = role === "employee"
      ? requests.filter((r) =>
          r.employeeId === user?.id ||
          r.financialNumber === user?.financialNumber ||
          r.createdBy === user?.id)
      : requests;
    return [...mine].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, role, user]);

  const stats = useMemo(() => ({
    open: myRequests.filter((r) => !CLOSED.includes(r.status)).length,
    today: myRequests.filter((r) => isToday(r.createdAt)).length,
    emergency: myRequests.filter((r) => r.requestType === "emergency" && !CLOSED.includes(r.status)).length,
    monthly: myRequests.filter((r) => r.serviceType === "monthly_treatment").length,
    // «مكتمل» = رجع وسجّل عند الأمن أو اتقفل نهائيًا
    completed: myRequests.filter((r) => ["returned", "completed", "monthly_completed"].includes(r.status)).length,
  }), [myRequests]);

  // عدّادات التنبيهات حسب الدور
  const pendingApproval = requests.filter((r) => r.status === "pending").length;
  const readyForDoctor = requests.filter((r) => r.status === "checked_out").length;
  const readyToDispense = requests.filter((r) => r.status === "prescribed").length;
  const readyToExit = requests.filter((r) => r.status === "approved").length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* ترحيب */}
        <div>
          <h1 className="text-3xl font-bold">مرحباً بك، {user?.name || "مستخدم"}</h1>
          <p className="mt-1 text-slate-500">لوحة التحكم الموحّدة — كل ما يخصك في مكان واحد.</p>
        </div>

        {/* تنبيهات حسب الدور */}
        <div className="space-y-3">
          {(isManager || isOversight) && pendingApproval > 0 && (
            <AlertBanner color="yellow" icon={ClipboardCheck}
              text={`${pendingApproval} طلب بانتظار موافقتك`}
              to="/manager/approvals" cta="مراجعة الطلبات" />
          )}
          {(isDoctor || isOversight) && readyForDoctor > 0 && (
            <AlertBanner color="blue" icon={Stethoscope}
              text={`${readyForDoctor} مريض جاهز للكشف`}
              to="/doctor" cta="فتح قائمة الفحص" />
          )}
          {(isPharmacy || isOversight) && readyToDispense > 0 && (
            <AlertBanner color="purple" icon={Pill}
              text={`${readyToDispense} روشتة جاهزة للصرف`}
              to="/pharmacy" cta="فتح قائمة الصيدلية" />
          )}
          {(isSecurity || isOversight) && readyToExit > 0 && (
            <AlertBanner color="teal" icon={Shield}
              text={`${readyToExit} طلب موافق عليه جاهز للخروج`}
              to="/security" cta="فتح بوابة الأمن" />
          )}
        </div>

        {/* الإحصائيات المشتركة */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatTile title="طلبات مفتوحة" value={stats.open} icon={FolderOpen} />
          <StatTile title="طلبات اليوم" value={stats.today} icon={ClipboardList} />
          <StatTile title="حالات طارئة" value={stats.emergency} icon={Siren} danger />
          <StatTile title="علاج شهري" value={stats.monthly} icon={HeartPulse} />
          <StatTile title="مكتمل" value={stats.completed} icon={CheckCircle2} />
        </div>

        {/* الزراير السريعة + أحدث الطلبات */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>إجراءات سريعة</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <QuickAction title="طلب جديد" icon={FilePlus2} to="/request/new" />
              <QuickAction title="طلباتي" icon={ClipboardList} to="/my-requests" />
              {(isManager || isOversight) && <QuickAction title="موافقات المدير" icon={ClipboardCheck} to="/manager/approvals" />}
              {(isDoctor || isOversight) && <QuickAction title="فحص الطبيب" icon={Stethoscope} to="/doctor" />}
              {(isPharmacy || isOversight) && <QuickAction title="قائمة الصيدلية" icon={Pill} to="/pharmacy" />}
              {(isSecurity || isOversight) && <QuickAction title="بوابة الأمن" icon={Shield} to="/security" />}
              <QuickAction title="الإشعارات" icon={Bell} to="/employee/notifications" />
              <QuickAction title="الملف الشخصي" icon={UserCircle} to="/profile" />
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>أحدث الطلبات</span>
                <Link to="/my-requests" className="text-sm font-normal text-teal-700">عرض الكل</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myRequests.slice(0, 6).length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                  لا توجد طلبات بعد.
                </div>
              )}
              {myRequests.slice(0, 6).map((r) => (
                <Link
                  key={r.id}
                  to={`/requests/${r.id}`}
                  className="-mx-2 flex items-center justify-between rounded-lg border-b px-2 pb-3 transition last:border-0 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-bold">{role === "employee" ? `طلب ${r.id}` : r.employeeName || `طلب ${r.id}`}</p>
                    <p className="text-sm text-slate-500">
                      {r.requestType === "emergency" ? "طوارئ" : r.serviceType === "monthly_treatment" ? "علاج شهري" : "كشف عادي"}
                      {" • "}{formatDate(r.createdAt)}
                    </p>
                  </div>
                  <Badge className={statusBadgeClass(r.status)}>{requestStatusLabels[r.status]}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* لوحة توزيع الإدارات: المدير (إداراته) · الطبية والسوبر (الكل) */}
        {(isManager || isOversight) && <ManagerDeptPanel requests={requests} />}

        {/* لوحة الصيدلية: مين استلم ومين لسه (منع التهرب) — الصيدلية والطبية والسوبر */}
        {(isPharmacy || isOversight) && <PharmacyPickupBoard requests={requests} />}
      </div>
    </AppShell>
  );
}

/* ── ودجتس ───────────────────────────────────────────── */

function AlertBanner({ color, icon: Icon, text, to, cta }: {
  color: "yellow" | "blue" | "purple" | "teal";
  icon: any; text: string; to: string; cta: string;
}) {
  const colors = {
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    purple: "border-purple-200 bg-purple-50 text-purple-800",
    teal: "border-teal-200 bg-teal-50 text-teal-800",
  }[color];
  return (
    <div className={`flex items-center justify-between rounded-xl border p-4 ${colors}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6" />
        <p className="font-bold">{text}</p>
      </div>
      <Link to={to} className="rounded-lg bg-white px-4 py-1.5 text-sm font-bold shadow-sm">
        {cta}
      </Link>
    </div>
  );
}

function StatTile({ title, value, icon: Icon, danger }: {
  title: string; value: number; icon: any; danger?: boolean;
}) {
  const hot = danger && value > 0;
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className={`mt-1 text-3xl font-bold ${hot ? "text-red-600" : "text-teal-700"}`}>{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${hot ? "bg-red-100" : "bg-teal-100"}`}>
          <Icon className={`h-5 w-5 ${hot ? "text-red-600" : "text-teal-700"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ title, icon: Icon, to }: { title: string; icon: any; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl bg-teal-50 p-3 text-teal-800 transition hover:shadow-sm">
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-bold">{title}</p>
    </Link>
  );
}

function ManagerDeptPanel({ requests }: { requests: MedicalRequest[] }) {
  const byDept = useMemo(() => {
    const map = new Map<string, { employees: Set<string>; open: number; total: number }>();
    for (const r of requests) {
      const dept = r.department || "غير محدد";
      if (!map.has(dept)) map.set(dept, { employees: new Set(), open: 0, total: 0 });
      const entry = map.get(dept)!;
      entry.employees.add(r.financialNumber || r.employeeName || String(r.employeeId ?? r.id));
      entry.total += 1;
      if (!CLOSED.includes(r.status)) entry.open += 1;
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [requests]);

  if (byDept.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-700" />
          توزيع الطلبات على إداراتك
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {byDept.map(([dept, info]) => (
            <div key={dept} className="rounded-xl border bg-slate-50 p-4">
              <p className="font-bold">{dept}</p>
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{info.employees.size} موظف</span>
                <span>{info.open} مفتوح</span>
                <span>{info.total} إجمالي</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * لوحة استلام الأدوية — لمنع التهرب:
 * مين كشفه خلص ولسه مجاش يستلم · مين استلم (كامل/جزئي).
 */
function PharmacyPickupBoard({ requests }: { requests: MedicalRequest[] }) {
  const { isApiConnected } = useAuth();
  const [apiRows, setApiRows] = useState<any[] | null>(null);

  useEffect(() => {
    if (!isApiConnected) return;
    apiClient.get("/internal-pharmacy/prescriptions?status=all&per_page=100")
      .then((res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        setApiRows(items);
      })
      .catch(() => {});
  }, [isApiConnected]);

  const { waiting, pickedFull, pickedPartial } = useMemo(() => {
    if (apiRows) {
      const waiting: PickupRow[] = [], pickedFull: PickupRow[] = [], pickedPartial: PickupRow[] = [];
      for (const p of apiRows) {
        const name =
          p.employee_name ??
          p.checkup_request?.employee?.name ??
          p.checkupRequest?.employee?.user?.name ??
          `روشتة ${p.id}`;
        const partial = (p.items ?? []).some((i: any) => i.is_available === false);
        const row = { id: p.id, name };
        if (!p.dispensed_at) waiting.push(row);
        else if (partial) pickedPartial.push(row);
        else pickedFull.push(row);
      }
      return { waiting, pickedFull, pickedPartial };
    }
    // fallback محلي من حالات الطلبات
    const waiting = requests.filter((r) => r.status === "prescribed")
      .map((r) => ({ id: r.id, name: r.employeeName || `طلب ${r.id}` }));
    const pickedFull = requests.filter((r) => ["dispensed", "returned", "completed"].includes(r.status))
      .map((r) => ({ id: r.id, name: r.employeeName || `طلب ${r.id}` }));
    return { waiting, pickedFull, pickedPartial: [] as PickupRow[] };
  }, [apiRows, requests]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-purple-700" />
          متابعة استلام الأدوية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <PickupColumn title="كشفه خلص ولم يستلم" tone="red" rows={waiting} empty="لا يوجد متأخرون عن الاستلام." />
          <PickupColumn title="استلم — جزئي" tone="yellow" rows={pickedPartial} empty="لا يوجد صرف جزئي." />
          <PickupColumn title="استلم — كامل" tone="green" rows={pickedFull} empty="لا يوجد مستلمون بعد." />
        </div>
      </CardContent>
    </Card>
  );
}

type PickupRow = { id: any; name: string };

function PickupColumn({ title, tone, rows, empty }: {
  title: string; tone: "red" | "yellow" | "green"; rows: PickupRow[]; empty: string;
}) {
  const tones = {
    red: "border-red-200 bg-red-50 text-red-800",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
    green: "border-green-200 bg-green-50 text-green-800",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${tones}`}>
      <div className="flex items-center justify-between">
        <p className="font-bold">{title}</p>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-bold shadow-sm">{rows.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.length === 0 && <p className="text-sm opacity-70">{empty}</p>}
        {rows.slice(0, 6).map((r) => (
          <div key={String(r.id)} className="rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-slate-800">
            {r.name}
          </div>
        ))}
        {rows.length > 6 && <p className="text-xs opacity-70">+{rows.length - 6} آخرون</p>}
      </div>
    </div>
  );
}
