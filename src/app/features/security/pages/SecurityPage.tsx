import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Clock,
  LogIn,
  LogOut,
  Search,
  Shield,
  Users,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { securityStore } from "@/app/store/securityStore";
import { useStore } from "@/app/store/reactiveStore";
import { requestStatusLabels } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";
import { toast } from "sonner";

const outsideStatuses = ["checked_out", "in_diagnosis", "prescribed", "dispensed"];

const LATE_THRESHOLD_HOURS = 3;

function formatTime(value?: string) {
  if (!value) return "غير محدد";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";

  return date.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchesSearch(request: MedicalRequest, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return (
    request.employeeName.toLowerCase().includes(term) ||
    request.financialNumber.toLowerCase().includes(term) ||
    request.id.toLowerCase().includes(term) ||
    request.department?.toLowerCase().includes(term)
  );
}

function RequestCard({
  request,
  actionLabel,
  actionIcon: Icon,
  onAction,
}: {
  request: MedicalRequest;
  actionLabel: string;
  actionIcon: any;
  onAction: () => void;
}) {
  const isEmergency = request.requestType === "emergency";

  return (
    <Card className={`border-r-4 ${isEmergency ? "border-r-red-500" : "border-r-blue-500"}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">{request.employeeName}</span>
              <Badge variant="outline">{request.financialNumber}</Badge>
              <Badge className={isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                {isEmergency ? "طوارئ" : "عادي"}
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-700">
                {requestStatusLabels[request.status]}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              {request.department || "غير محدد"} • {request.id}
            </p>
            <p className="mt-2 text-sm text-slate-600">{request.reason}</p>
          </div>

          <Button size="sm" onClick={onAction} className="bg-green-600 hover:bg-green-700">
            <Icon className="ml-2 h-4 w-4" />
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovedRequestsTab() {
  const [search, setSearch] = useState("");
  const { requests, checkOutRequest } = useWorkflow();

  const filtered = requests
    .filter((request) => request.status === "approved" && matchesSearch(request, search))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleCheckOut = (requestId: string) => {
    checkOutRequest(requestId, "تم تسجيل خروج الموظف من بوابة الأمن");
    toast.success("تم تسجيل الخروج");
  };

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} count={filtered.length} label="طلب جاهز للخروج" />

      {filtered.length === 0 && <EmptyState text="لا توجد طلبات معتمدة جاهزة لتسجيل الخروج." />}

      {filtered.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          actionLabel="تسجيل خروج"
          actionIcon={LogOut}
          onAction={() => handleCheckOut(request.id)}
        />
      ))}
    </div>
  );
}

function CheckInTab() {
  const [search, setSearch] = useState("");
  const { requests, checkInRequest } = useWorkflow();

  const filtered = requests
    .filter((request) => request.status === "dispensed" && matchesSearch(request, search))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleCheckIn = (requestId: string) => {
    checkInRequest(requestId, "تم تسجيل عودة الموظف من بوابة الأمن");
    toast.success("تم تسجيل العودة");
  };

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} count={filtered.length} label="طلب جاهز للعودة" />

      {filtered.length === 0 && <EmptyState text="لا توجد طلبات جاهزة لتسجيل العودة بعد الصرف." />}

      {filtered.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          actionLabel="تسجيل عودة"
          actionIcon={LogIn}
          onAction={() => handleCheckIn(request.id)}
        />
      ))}
    </div>
  );
}

function EmployeesOutsideTab() {
  const { requests } = useWorkflow();

  const outsideRequests = requests.filter((request) => outsideStatuses.includes(request.status));

  return (
    <div className="space-y-4">
      {outsideRequests.length === 0 && <EmptyState text="لا يوجد موظفون خارج الشركة حالياً ضمن مسار الكشف." />}

      {outsideRequests.map((request) => (
        <Card key={request.id} className="border-r-4 border-r-orange-500">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">{request.employeeName}</span>
                  <Badge variant="outline">{request.financialNumber}</Badge>
                  <Badge className="bg-orange-100 text-orange-700">
                    {requestStatusLabels[request.status]}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">
                  {request.department || "غير محدد"} • خرج تقريباً {formatTime(request.createdAt)}
                </p>
              </div>
              <Badge className="bg-slate-100 text-slate-700">{request.id}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LateEmployeesTab() {
  const { requests } = useWorkflow();

  const now = Date.now();
  const lateRequests = requests
    .filter((r) => outsideStatuses.includes(r.status))
    .map((r) => {
      const outAt = r.checkedOutAt ? new Date(r.checkedOutAt).getTime() : new Date(r.createdAt).getTime();
      const hoursOut = (now - outAt) / 1000 / 60 / 60;
      return { request: r, hoursOut };
    })
    .filter(({ hoursOut }) => hoursOut >= LATE_THRESHOLD_HOURS)
    .sort((a, b) => b.hoursOut - a.hoursOut);

  if (lateRequests.length === 0) {
    return <EmptyState text={`لا يوجد موظفون تجاوزوا ${LATE_THRESHOLD_HOURS} ساعات خارج الشركة.`} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        الموظفون المعروضون خرجوا منذ أكثر من {LATE_THRESHOLD_HOURS} ساعات ولم يعودوا بعد.
      </div>

      {lateRequests.map(({ request, hoursOut }) => {
        const isEmergency = request.requestType === "emergency";
        const hoursLabel = hoursOut >= 24
          ? `${Math.floor(hoursOut / 24)} يوم و${Math.floor(hoursOut % 24)} ساعة`
          : `${Math.floor(hoursOut)} ساعة و${Math.floor((hoursOut % 1) * 60)} دقيقة`;

        return (
          <Card key={request.id} className="border-r-4 border-r-amber-500">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{request.employeeName}</span>
                    <Badge variant="outline">{request.financialNumber}</Badge>
                    <Badge className={isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                      {isEmergency ? "طوارئ" : "عادي"}
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-700">
                      {requestStatusLabels[request.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {request.department || "غير محدد"} • {request.id}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className="bg-red-100 text-red-700 text-sm px-3 py-1">
                    ⏱ خارج منذ {hoursLabel}
                  </Badge>
                  <p className="text-xs text-slate-500">
                    وقت الخروج: {formatTime(request.checkedOutAt || request.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SecurityLogsTab() {
  const logs = useStore(securityStore, (s) => s.getAll()).slice().reverse();

  if (logs.length === 0) {
    return <EmptyState text="لا توجد حركات أمن مسجلة حتى الآن." />;
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-right">الوقت</th>
              <th className="p-3 text-right">الرقم المالي</th>
              <th className="p-3 text-right">الاسم</th>
              <th className="p-3 text-right">الإجراء</th>
              <th className="p-3 text-right">رقم الطلب</th>
              <th className="p-3 text-right">مسؤول الأمن</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {logs.map((log: any) => (
              <tr key={log.id}>
                <td className="p-3 text-xs text-slate-500">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString("ar-EG") : log.time || "-"}
                </td>
                <td className="p-3">{log.employeeId}</td>
                <td className="p-3 font-semibold">{log.employeeName || log.name}</td>
                <td className="p-3">
                  {log.action === "CHECK_OUT" ? "تسجيل خروج" : log.action === "CHECK_IN" ? "تسجيل عودة" : log.action}
                </td>
                <td className="p-3">{log.requestId}</td>
                <td className="p-3">{log.doneBy || log.securityOfficer || "غير محدد"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SearchBar({
  value,
  onChange,
  count,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  count: number;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="relative max-w-md flex-1">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 pr-10"
          placeholder="بحث بالاسم أو الرقم المالي أو رقم الطلب..."
        />
      </div>
      <Badge className="bg-blue-100 px-3 py-1 text-blue-700">
        {count} {label}
      </Badge>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
      {text}
    </div>
  );
}

export function SecurityPage() {
  const { requests } = useWorkflow();

  const approvedRequests = requests.filter((request) => request.status === "approved");
  const outsideRequests = requests.filter((request) => outsideStatuses.includes(request.status));
  const returnReady = requests.filter((request) => request.status === "dispensed");
  const securityLogs = useStore(securityStore, (s) => s.getAll());

  const now = Date.now();
  const lateCount = outsideRequests.filter((r) => {
    const outAt = r.checkedOutAt ? new Date(r.checkedOutAt).getTime() : new Date(r.createdAt).getTime();
    return (now - outAt) / 1000 / 60 / 60 >= LATE_THRESHOLD_HOURS;
  }).length;

  const stats = useMemo(
    () => [
      { label: "طلبات معتمدة", value: approvedRequests.length, color: "text-blue-700" },
      { label: "خارج الشركة الآن", value: outsideRequests.length, color: "text-orange-700" },
      { label: "جاهز للعودة", value: returnReady.length, color: "text-green-700" },
      { label: "متأخرون", value: lateCount, color: lateCount > 0 ? "text-red-700" : "text-slate-400" },
    ],
    [approvedRequests.length, outsideRequests.length, returnReady.length, lateCount]
  );

  return (
    <PageLayout
      title="نظام الأمن"
      subtitle="تسجيل خروج وعودة الموظفين ومتابعة المتواجدين خارج الشركة"
      icon={<Shield className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <div className={`mb-1 text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-sm text-slate-600">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="approved" dir="rtl">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="approved" className="gap-1.5 text-xs"><CheckCircle className="h-3.5 w-3.5" />الطلبات المعتمدة</TabsTrigger>
          <TabsTrigger value="checkin" className="gap-1.5 text-xs"><LogIn className="h-3.5 w-3.5" />تسجيل عودة</TabsTrigger>
          <TabsTrigger value="outside" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />خارج الشركة</TabsTrigger>
          <TabsTrigger value="late" className="gap-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            متأخرون
            {lateCount > 0 && (
              <span className="mr-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">{lateCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" />سجل الحركة</TabsTrigger>
        </TabsList>

        <TabsContent value="approved"><ApprovedRequestsTab /></TabsContent>
        <TabsContent value="checkin"><CheckInTab /></TabsContent>
        <TabsContent value="outside"><EmployeesOutsideTab /></TabsContent>
        <TabsContent value="late"><LateEmployeesTab /></TabsContent>
        <TabsContent value="logs"><SecurityLogsTab /></TabsContent>
      </Tabs>
    </PageLayout>
  );
}
