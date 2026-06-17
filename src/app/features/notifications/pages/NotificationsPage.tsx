import { useState } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  FileText,
  Filter,
} from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { notificationStore } from "@/app/store/notificationStore";

export function NotificationsPage() {
  const [active, setActive] = useState("all");

  const notifications = notificationStore.getAll();

  const filtered =
    active === "unread"
      ? notifications.filter((notification) => notification.unread)
      : notifications;

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
              <p className="mt-2 text-3xl font-bold text-blue-700">
                {notifications.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">غير مقروءة</p>
              <p className="mt-2 text-3xl font-bold text-red-700">
                {notifications.filter((notification) => notification.unread).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">طلبات طبية</p>
              <p className="mt-2 text-3xl font-bold text-teal-700">
                {notifications.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">آخر تحديث</p>
              <p className="mt-2 text-3xl font-bold text-purple-700">
                الآن
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <span>الإشعارات</span>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={active === "all" ? "default" : "outline"}
                  onClick={() => setActive("all")}
                >
                  الكل
                </Button>

                <Button
                  size="sm"
                  variant={active === "unread" ? "default" : "outline"}
                  onClick={() => setActive("unread")}
                >
                  غير مقروء
                </Button>

                <Button size="sm" variant="outline">
                  <Filter className="w-4 h-4 ml-2" />
                  تصفية
                </Button>

                <Button size="sm" variant="outline">
                  <CheckCheck className="w-4 h-4 ml-2" />
                  تعليم الكل كمقروء
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {notifications.length === 0 && (
              <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                لا توجد إشعارات حالياً
              </div>
            )}

            {filtered.map((item) => {
              const Icon = item.icon || Bell;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition hover:shadow-sm ${
                    item.unread ? "bg-blue-50/40 border-blue-200" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${
                        item.bg || "bg-blue-50"
                      } flex items-center justify-center`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          item.color || "text-blue-700"
                        }`}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {item.title}
                        </h3>

                        {item.unread && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            جديد
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-600">
                        {item.message}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {item.time}
                      </div>
                    </div>

                    <Button size="sm" variant="ghost">
                      <FileText className="w-4 h-4 ml-2" />
                      التفاصيل
                    </Button>
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