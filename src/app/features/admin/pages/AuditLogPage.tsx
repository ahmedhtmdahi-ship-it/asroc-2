import { useEffect, useState } from "react";
import { FileText, RefreshCw, Search, Shield } from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { apiClient } from "@/app/services/apiClient";
import { useAuth } from "@/app/features/auth/AuthContext";

interface AuditEntry {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  request_id: number | null;
  status_before: string | null;
  status_after: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  created:            "إنشاء طلب",
  approved:           "اعتماد",
  rejected:           "رفض",
  postponed:          "تأجيل",
  cancelled:          "إلغاء",
  checked_out:        "تسجيل خروج",
  returned:           "تسجيل عودة",
  in_diagnosis:       "بدء الكشف",
  prescribed:         "روشتة محررة",
  dispensed:          "صرف دواء",
  completed:          "اكتمل",
  login:              "تسجيل دخول",
  logout:             "تسجيل خروج",
};

const actionColors: Record<string, string> = {
  approved:    "bg-green-100 text-green-800",
  rejected:    "bg-red-100 text-red-800",
  cancelled:   "bg-red-100 text-red-800",
  postponed:   "bg-orange-100 text-orange-800",
  created:     "bg-blue-100 text-blue-800",
  dispensed:   "bg-purple-100 text-purple-800",
  completed:   "bg-teal-100 text-teal-800",
  checked_out: "bg-yellow-100 text-yellow-800",
  returned:    "bg-cyan-100 text-cyan-800",
};

function getActionBadge(action: string) {
  const color = actionColors[action] ?? "bg-slate-100 text-slate-700";
  const label = actionLabels[action] ?? action;
  return <Badge className={color}>{label}</Badge>;
}

export function AuditLogPage() {
  const { isApiConnected } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const fetchLogs = async (pageNum = 1) => {
    if (!isApiConnected) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "50", page: String(pageNum) });
      if (filterAction) params.set("action", filterAction);
      if (dateFrom)    params.set("from", dateFrom);
      if (dateTo)      params.set("to", dateTo);

      const res: any = await apiClient.get(`/admin/audit-logs?${params}`);
      setLogs(res.data ?? []);
      setLastPage(res.meta?.last_page ?? 1);
      setPage(pageNum);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(1); }, [isApiConnected]);

  const displayed = logs.filter((log) => {
    if (!searchUser) return true;
    return log.user_name?.toLowerCase().includes(searchUser.toLowerCase());
  });

  return (
    <PageLayout
      title="سجل التدقيق"
      subtitle="جميع الإجراءات والأحداث في النظام"
      icon={<Shield className="w-5 h-5" />}
      backLink="/super-admin"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="w-4 h-4 text-blue-700" />
              فلاتر البحث
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input
                placeholder="بحث باسم المستخدم..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">كل الإجراءات</option>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="من تاريخ" />
              <Input type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)}   placeholder="إلى تاريخ" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => fetchLogs(1)} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Search className="w-4 h-4 ml-2" />}
                بحث
              </Button>
              <Button variant="outline" onClick={() => { setFilterAction(""); setDateFrom(""); setDateTo(""); setSearchUser(""); fetchLogs(1); }}>
                إعادة تعيين
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-blue-700" />
                السجل ({displayed.length} نتيجة)
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                صفحة {page} من {lastPage}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isApiConnected && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                سجل التدقيق يتطلب اتصالاً بالخادم.
              </div>
            )}

            {isApiConnected && displayed.length === 0 && !loading && (
              <div className="rounded-xl border border-dashed p-8 text-center text-slate-400">
                لا توجد سجلات مطابقة.
              </div>
            )}

            {displayed.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3 text-right">المستخدم</th>
                      <th className="p-3 text-right">الإجراء</th>
                      <th className="p-3 text-right">رقم الطلب</th>
                      <th className="p-3 text-right">من حالة → إلى حالة</th>
                      <th className="p-3 text-right">التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {displayed.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-semibold text-slate-900">{log.user_name}</td>
                        <td className="p-3">{getActionBadge(log.action)}</td>
                        <td className="p-3">
                          {log.request_id
                            ? <span className="font-mono text-blue-700">#{log.request_id}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3">
                          {log.status_before || log.status_after
                            ? <span className="text-xs text-slate-600">{log.status_before ?? "—"} → {log.status_after ?? "—"}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3 text-slate-500 text-xs">
                          {new Date(log.created_at).toLocaleString("ar-EG")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {lastPage > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>السابق</Button>
                <span className="flex items-center px-3 text-sm text-slate-600">{page} / {lastPage}</span>
                <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => fetchLogs(page + 1)}>التالي</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
