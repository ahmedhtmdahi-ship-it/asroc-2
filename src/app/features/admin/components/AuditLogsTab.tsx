import { useEffect, useState } from "react";

import { Card } from "@/app/components/ui/card";
import { listAuditLogsApi } from "@/app/lib/dataApi";
import { EmptyState, ErrorState, LoadingState } from "./adminShared";

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  request_id?: string;
  status_before?: string;
  status_after?: string;
  created_at: string;
}

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAuditLogsApi(500);
      setLogs(data.map((l) => ({
        id:            l.id,
        user_id:       l.user_id ?? "",
        user_name:     l.user_name ?? "",
        action:        l.action,
        request_id:    l.request_id ?? undefined,
        status_before: l.status_before ?? undefined,
        status_after:  l.status_after ?? undefined,
        created_at:    l.created_at,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل السجل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchLogs} />;

  if (logs.length === 0) {
    return <EmptyState message="لا توجد عمليات مسجلة حتى الآن." />;
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-right">المستخدم</th>
              <th className="p-3 text-right">الإجراء</th>
              <th className="p-3 text-right">الطلب</th>
              <th className="p-3 text-right">من</th>
              <th className="p-3 text-right">إلى</th>
              <th className="p-3 text-right">التوقيت</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="p-3 font-semibold">{log.user_name || "غير محدد"}</td>
                <td className="p-3">{log.action || "تحديث"}</td>
                <td className="p-3">{log.request_id || "-"}</td>
                <td className="p-3">{log.status_before || "-"}</td>
                <td className="p-3">{log.status_after || "-"}</td>
                <td className="p-3 text-xs text-slate-500">
                  {log.created_at ? new Date(log.created_at).toLocaleString("ar-EG") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
