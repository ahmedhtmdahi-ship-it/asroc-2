import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Loader2,
  Printer,
  Users,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { useAuth } from "@/app/features/auth/AuthContext";
import { apiClient } from "@/app/services/apiClient";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStatusLabels } from "@/app/types/workflow";

interface DashboardStats {
  today: { new_requests: number; approved: number; rejected: number; outside_now: number };
  this_month: { total_requests: number; normal: number; emergency: number; completed: number; pending: number; rejected: number };
  pharmacy: { prescriptions_dispensed: number; low_stock_medicines: number };
  referrals: { pending_approval: number; approved_this_month: number; rejected_this_month: number };
}

function StatCard({
  value,
  label,
  icon: Icon,
  color,
  bg,
}: {
  value: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="text-left">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState("2026-06");
  const [searchTerm, setSearchTerm] = useState("");
  const { requests } = useWorkflow();
  const { isApiConnected } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isApiConnected) return;
    apiClient.get("/reports/dashboard")
      .then((res: any) => setDashboardStats(res ?? null))
      .catch(() => {});
  }, [isApiConnected]);

  const handleExport = async (type: string) => {
    if (!isApiConnected) { window.print(); return; }
    setExporting(true);
    try {
      const month = selectedMonth || new Date().toISOString().slice(0, 7);
      const [y, m] = month.split("-");
      const dateFrom = `${y}-${m}-01`;
      const dateTo   = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10);
      await apiClient.download(
        `/reports/export?type=${type}&format=csv&date_from=${dateFrom}&date_to=${dateTo}`,
        `report_${type}_${month}.csv`
      );
    } catch {
      // fallback silent
    } finally {
      setExporting(false);
    }
  };

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !term ||
        `${request.id} ${request.employeeName} ${request.financialNumber} ${request.department}`
          .toLowerCase()
          .includes(term);

      const month = request.createdAt.slice(0, 7);
      const matchesMonth = !selectedMonth || month === selectedMonth;

      return matchesSearch && matchesMonth;
    });
  }, [requests, searchTerm, selectedMonth]);

  const totalRequests = filteredRequests.length;
  const pendingRequests = filteredRequests.filter(
    (request) => request.status === "pending"
  ).length;
  const approvedRequests = filteredRequests.filter(
    (request) => request.status === "approved"
  ).length;
  const completedRequests = filteredRequests.filter((request) =>
    ["completed", "monthly_completed"].includes(request.status)
  ).length;
  const emergencyRequests = filteredRequests.filter(
    (request) => request.requestType === "emergency"
  ).length;
  const outsideEmployees = filteredRequests.filter((request) =>
    ["checked_out", "in_diagnosis", "prescribed", "dispensed"].includes(
      request.status
    )
  ).length;
  const dispensedRequests = filteredRequests.filter((request) =>
    ["dispensed", "monthly_dispensed", "monthly_completed"].includes(
      request.status
    )
  ).length;
  const rejectedRequests = filteredRequests.filter((request) =>
    ["rejected", "monthly_rejected"].includes(request.status)
  ).length;
  const monthlyTreatmentRequests = filteredRequests.filter(
    (request) => request.serviceType === "monthly_treatment"
  ).length;

  const statusRows = Object.entries(requestStatusLabels)
    .map(([status, label]) => ({
      status,
      label,
      count: filteredRequests.filter((request) => request.status === status)
        .length,
    }))
    .filter((row) => row.count > 0);

  return (
    <PageLayout
      title="التقارير والإحصائيات"
      subtitle="متابعة مؤشرات الخدمات الطبية وحركة الطلبات"
      icon={<FileText className="h-5 w-5" />}
      backLink="/dashboard"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
          <StatCard
            value={(dashboardStats?.this_month.total_requests ?? totalRequests).toString()}
            label="إجمالي الطلبات (الشهر)"
            icon={ClipboardList}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard
            value={(dashboardStats?.this_month.pending ?? pendingRequests).toString()}
            label="بانتظار الاعتماد"
            icon={Clock}
            color="text-yellow-600"
            bg="bg-yellow-50"
          />
          <StatCard
            value={(dashboardStats?.today.approved ?? approvedRequests).toString()}
            label="معتمدة اليوم"
            icon={CheckCircle2}
            color="text-teal-600"
            bg="bg-teal-50"
          />
          <StatCard
            value={(dashboardStats?.this_month.completed ?? completedRequests).toString()}
            label="مكتملة"
            icon={CheckCircle2}
            color="text-green-600"
            bg="bg-green-50"
          />
          <StatCard
            value={(dashboardStats?.this_month.emergency ?? emergencyRequests).toString()}
            label="طوارئ"
            icon={AlertTriangle}
            color="text-red-600"
            bg="bg-red-50"
          />
          <StatCard
            value={(dashboardStats?.today.outside_now ?? outsideEmployees).toString()}
            label="خارج الشركة"
            icon={Users}
            color="text-orange-600"
            bg="bg-orange-50"
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-700" />
                فلاتر التقرير
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="ml-2 h-4 w-4" />
                  طباعة
                </Button>
                <Button variant="outline" onClick={() => handleExport("monthly")} disabled={exporting}>
                  {exporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Download className="ml-2 h-4 w-4" />}
                  تصدير Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="بحث باسم الموظف أو رقم الطلب..."
              />
              <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                النتائج الحالية:{" "}
                <span className="font-bold text-slate-900">
                  {filteredRequests.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-blue-700" />
                توزيع الطلبات حسب النوع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "كشف عادي",    value: (dashboardStats?.this_month.normal   ?? (totalRequests - emergencyRequests - monthlyTreatmentRequests)) || 0 },
                      { name: "كشف طوارئ",   value: (dashboardStats?.this_month.emergency ?? emergencyRequests) || 0 },
                      { name: "علاج شهري",   value: monthlyTreatmentRequests || 0 },
                    ].filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#ef4444" />
                    <Cell fill="#14b8a6" />
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} طلب`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-teal-700" />
                توزيع الحالات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={statusRows.slice(0, 7).map((r) => ({ name: r.label, عدد: r.count }))}
                  layout="vertical"
                  margin={{ right: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="عدد" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ملخص تشغيلي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ["روشتات مصروفة", dashboardStats?.pharmacy.prescriptions_dispensed ?? dispensedRequests],
                ["تحويلات معلقة", dashboardStats?.referrals.pending_approval ?? 0],
                ["طلبات مرفوضة", dashboardStats?.this_month.rejected ?? rejectedRequests],
                ["طلبات عادية", dashboardStats?.this_month.normal ?? (totalRequests - emergencyRequests)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b pb-3"
                >
                  <span className="text-slate-600">{label}</span>
                  <span className="font-bold text-slate-900">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">توزيع الحالات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {statusRows.map((row) => (
                  <div
                    key={row.status}
                    className="flex items-center justify-between rounded-xl border bg-white p-3"
                  >
                    <Badge variant="outline">{row.label}</Badge>
                    <span className="font-bold text-slate-900">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-700" />
              آخر الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-right">رقم الطلب</th>
                    <th className="p-3 text-right">الموظف</th>
                    <th className="p-3 text-right">الخدمة</th>
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {filteredRequests.slice(0, 12).map((request) => (
                    <tr key={request.id}>
                      <td className="p-3 font-semibold text-blue-700">
                        {request.id}
                      </td>
                      <td className="p-3">{request.employeeName}</td>
                      <td className="p-3">
                        {request.serviceType === "monthly_treatment"
                          ? "علاج شهري"
                          : request.requestType === "emergency"
                          ? "كشف طوارئ"
                          : "كشف عادي"}
                      </td>
                      <td className="p-3">
                        {new Date(request.createdAt).toLocaleDateString(
                          "ar-EG"
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {requestStatusLabels[request.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRequests.length === 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-yellow-100 bg-yellow-50 p-3 text-sm text-yellow-800">
                <XCircle className="h-4 w-4" />
                لا توجد نتائج مطابقة للفلاتر الحالية.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
