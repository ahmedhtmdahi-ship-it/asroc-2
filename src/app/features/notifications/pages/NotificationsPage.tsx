import { useState } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Pill,
  LogIn,
} from "lucide-react";
import { useNavigate } from "react-router";
import { PageLayout } from "@/app/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { notificationStore } from "@/app/store/notificationStore";
import { useAuth } from "@/app/features/auth/AuthContext";

function iconForTitle(title: string) {
  if (title.includes("موافق") || title.includes("اعتماد")) return { Icon: CheckCircle2, color: "text-green-700", bg: "bg-green-50" };
  if (title.includes("رفض")) return { Icon: XCircle, color: "text-red-700", bg: "bg-red-50" };
  if (title.includes("صيدل") || title.includes("صرف") || title.includes("روشتة")) return { Icon: Pill, color: "text-purple-700", bg: "bg-purple-50" };
  if (title.includes("عودة") || title.includes("إنهاء")) return { Icon: LogIn, color: "text-teal-700", bg: "bg-teal-50" };
  return { Icon: Bell, color: "text-blue-700", bg: "bg-blue-50" };
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("all");
  const [, forceRender] = useState(0);

  const notifications = user
    ? notificationStore.getForUser(user.id)
    : notificationStore.getAll();

  const filtered =
    active === "unread"
      ? notifications.filter((n) => n.unread)
      : notifications;

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = () => {
    notificationStore.markAllAsRead(user?.id);
    forceRender((v) => v + 1);
  };

  const handleMarkRead = (id: string) => {
    notificationStore.markAsRead(id);
    forceRender((v) => v + 1);
  };

  return (
    <PageLayout
      title="مركز الإشعارات"
      subtitle="متابعة إشعارات الطلبات الطبية وحالة الإجراءات"
      backLink="/employee"
      icon={<Bell className="w-5 h-5" />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">كل الإشعارات</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{notifications.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">غير مقروءة</p>
              <p className="mt-2 text-3xl font-bold text-red-700">{unreadCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">طلبات طبية</p>
              <p className="mt-2 text-3xl font-bold text-teal-700">
                {notifications.filter((n) => n.requestId).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">آخر تحديث</p>
              <p className="mt-2 text-lg font-bold text-purple-700">
                {notifications[0] ? formatTime(notifications[0].createdAt) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <span>الإشعارات</span>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={active === "all" ? "default" : "outline"}
                  onClick={() => setActive("all")}
                >
                  الكل ({notifications.length})
                </Button>

                <Button
                  size="sm"
                  variant={active === "unread" ? "default" : "outline"}
                  onClick={() => setActive("unread")}
                >
                  غير مقروء ({unreadCount})
                </Button>

                {unreadCount > 0 && (
                  <Button size="sm" variant="outline" onClick={handleMarkAllRead}>
                    <CheckCheck className="w-4 h-4 ml-2" />
                    تعليم الكل كمقروء
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                {active === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات حالياً"}
              </div>
            )}

            {filtered.map((item) => {
              const { Icon, color, bg } = item.icon
                ? { Icon: item.icon, color: item.color || "text-blue-700", bg: item.bg || "bg-blue-50" }
                : iconForTitle(item.title);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition hover:shadow-sm ${
                    item.unread ? "bg-blue-50/40 border-blue-200" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{item.title}</h3>
                        {item.unread && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">جديد</Badge>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-600">{item.message}</p>

                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(item.createdAt)}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {item.requestId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            handleMarkRead(item.id);
                            navigate(`/employee/my-requests`);
                          }}
                        >
                          <FileText className="w-4 h-4 ml-2" />
                          التفاصيل
                        </Button>
                      )}
                      {item.unread && (
                        <Button size="sm" variant="ghost" onClick={() => handleMarkRead(item.id)}>
                          <CheckCheck className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
