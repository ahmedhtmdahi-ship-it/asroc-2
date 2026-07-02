import { Link } from "react-router";
import {
  ClipboardList,
  Eye,
  Filter,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth, getHomePathByRole } from "@/app/features/auth/AuthContext";
import { requestStatusLabels } from "@/app/types/workflow";
import { PageLayout } from "@/app/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";

export function MyMedicalRequestsPage() {
  const { requests } = useWorkflow();
  const { user } = useAuth();
  const backLink = getHomePathByRole(user?.role);

  const myRequests = requests.filter((request) => {
    return (
      request.employeeId === user?.id ||
      request.financialNumber === user?.financialNumber
    );
  });

  const stats = [
    {
      label: "إجمالي الطلبات",
      value: myRequests.length.toString(),
      icon: ClipboardList,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "قيد المعالجة",
      value: myRequests
        .filter(
          (request) =>
            !["completed", "monthly_completed", "rejected", "monthly_rejected", "cancelled"].includes(
              request.status
            )
        )
        .length.toString(),
      icon: Clock,
      color: "text-yellow-700",
      bg: "bg-yellow-50",
    },
    {
      label: "مكتملة",
      value: myRequests
        .filter((request) =>
          ["completed", "monthly_completed"].includes(request.status)
        )
        .length.toString(),
      icon: CheckCircle2,
      color: "text-teal-700",
      bg: "bg-teal-50",
    },
    {
      label: "مرفوضة",
      value: myRequests
        .filter((request) =>
          ["rejected", "monthly_rejected", "cancelled"].includes(request.status)
        )
        .length.toString(),
      icon: XCircle,
      color: "text-red-700",
      bg: "bg-red-50",
    },
  ];

  return (
    <PageLayout
      title="طلباتي الطبية"
      subtitle="متابعة حالة طلبات الكشف الطبي الخاصة بك"
      backLink={backLink}
      icon={<ClipboardList className="w-5 h-5" />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}
                  >
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>

                  <div className="text-left">
                    <p className={`text-3xl font-bold ${item.color}`}>
                      {item.value}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">{item.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>قائمة الطلبات</span>
              <Badge variant="outline">{myRequests.length} طلب</Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="mb-5 grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-3 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pr-10 h-11"
                  placeholder="بحث برقم الطلب أو سبب الطلب..."
                />
              </div>

              <Button variant="outline" className="h-11">
                <Filter className="w-4 h-4 ml-2" />
                الحالة
              </Button>

              <Button variant="outline" className="h-11">
                نوع الطلب
              </Button>
            </div>

            {myRequests.length === 0 && (
              <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                لا توجد طلبات طبية مسجلة حتى الآن.
              </div>
            )}

            {myRequests.length > 0 && (
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3 text-right">رقم الطلب</th>
                      <th className="p-3 text-right">النوع</th>
                      <th className="p-3 text-right">التاريخ</th>
                      <th className="p-3 text-right">السبب</th>
                      <th className="p-3 text-right">الأولوية</th>
                      <th className="p-3 text-right">الحالة</th>
                      <th className="p-3 text-right">الإجراء</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y bg-white">
                    {myRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-blue-700">
                          {request.id}
                        </td>

                        <td className="p-3">
                          {request.serviceType === "monthly_treatment"
                            ? "علاج شهري"
                            : request.requestType === "emergency"
                            ? "كشف طوارئ"
                            : "كشف عادي"}
                        </td>

                        <td className="p-3">
                          {new Date(request.createdAt).toLocaleDateString("ar-EG")}
                        </td>

                        <td className="p-3">{request.reason}</td>

                        <td className="p-3">
                          <Badge
                            className={
                              request.serviceType === "monthly_treatment"
                                ? "bg-teal-100 text-teal-700 border-teal-200"
                                : request.requestType === "emergency"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }
                            variant="outline"
                          >
                            {request.serviceType === "monthly_treatment"
                              ? "شهري"
                              : request.requestType === "emergency"
                              ? "طارئ"
                              : "عادي"}
                          </Badge>
                        </td>

                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 text-yellow-800 border-yellow-200"
                          >
                            {requestStatusLabels[request.status]}
                          </Badge>
                        </td>

                        <td className="p-3">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/requests/${request.id}`}>
                              <Eye className="w-4 h-4 ml-2" />
                              عرض
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>
                يتم تحديث حالة الطلب تلقائيًا حسب مسار الاعتماد والأمن والطبيب
                والصيدلية.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}