import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  User,
  UserCheck,
  XCircle,
  PauseCircle,
  ClipboardList,
  Eye,
} from "lucide-react";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth } from "@/app/features/auth/AuthContext";
import { requestStatusLabels } from "@/app/types/workflow";
import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { toast } from "sonner";

type ActionType = "approve" | "reject" | "postpone";

function KpiCard({ item }: { item: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div
            className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}
          >
            <item.icon className={`w-6 h-6 ${item.color}`} />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-slate-900">{item.value}</p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function ManagerApprovalsPage() {
  const {
    requests: allRequests,
    approveRequest,
    rejectRequest,
    postponeRequest,
  } = useWorkflow();
  const { user } = useAuth();

  // Managers only see their own department — super_admin and medical_admin see all
  const requests = useMemo(() => {
    if (!user) return allRequests;
    if (user.role === "super_admin" || user.role === "medical_admin") return allRequests;
    if (!user.department) return allRequests;
    return allRequests.filter((r) => r.department === user.department);
  }, [allRequests, user]);

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(
    pendingRequests[0] || null
  );
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [decisionReason, setDecisionReason] = useState("");

  const todayKey = new Date().toDateString();
  const decisions = [
    {
      label: "بانتظار القرار",
      value: pendingRequests.length,
      icon: Clock,
      color: "text-yellow-700",
      bg: "bg-yellow-50",
    },
    {
      label: "تمت الموافقة اليوم",
      value: requests.filter(
        (request) =>
          request.status === "approved" &&
          new Date(request.createdAt).toDateString() === todayKey
      ).length,
      icon: CheckCircle2,
      color: "text-teal-700",
      bg: "bg-teal-50",
    },
    {
      label: "تم الرفض",
      value: requests.filter((request) => request.status === "rejected").length,
      icon: XCircle,
      color: "text-red-700",
      bg: "bg-red-50",
    },
    {
      label: "تم التأجيل",
      value: requests.filter((request) => request.status === "postponed").length,
      icon: PauseCircle,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
  ];

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        requests
          .map((request) => request.department)
          .filter((department): department is string => Boolean(department))
      )
    ).sort((a, b) => a.localeCompare(b, "ar"));
  }, [requests]);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = `${request.employeeName} ${request.financialNumber} ${request.id}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || request.department === departmentFilter;
    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const handleAction = () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === "approve") {
      approveRequest(selectedRequest.id);

      toast.success("تمت الموافقة على الطلب", {
        description: `${selectedRequest.id} تم إرساله إلى الأمن لتسجيل الخروج.`,
      });
    }

    if (actionType === "reject") {
      rejectRequest(selectedRequest.id);

      toast.error("تم رفض الطلب", {
        description: "سيتم إخطار الموظف وإرجاع الرصيد الشهري.",
      });
    }

    if (actionType === "postpone") {
      postponeRequest(selectedRequest.id);

      toast.info("تم تأجيل الطلب", {
        description: "يمكن للموظف إعادة تقديم الطلب لاحقًا.",
      });
    }

    setActionType(null);
    setDecisionReason("");
    setSelectedRequest(null);
  };

  const actionLabel =
    actionType === "approve"
      ? "تأكيد الموافقة"
      : actionType === "reject"
      ? "تأكيد الرفض"
      : "تأكيد التأجيل";

  return (
    <PageLayout
      title="موافقات المدير"
      subtitle="مراجعة واعتماد طلبات الكشف الطبي للموظفين التابعين لإداراتك"
      backLink="/dashboard"
      icon={<UserCheck className="w-5 h-5" />}
    >
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-l from-[#0B1F3A] to-[#0D9488] p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">لوحة اعتماد الطلبات</p>
              <h2 className="text-2xl font-bold mt-1">
                طلبات بانتظار موافقة المدير
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white/15 text-white border-white/20">
                مدير إدارة
              </Badge>
              <Badge className="bg-white/15 text-white border-white/20">
                مدير مكتب بديل متاح
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {decisions.map((item) => (
            <KpiCard key={item.label} item={item} />
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pr-10 h-11"
                  placeholder="بحث باسم الموظف أو رقم الطلب..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="الإدارة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الإدارات</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="pending">بانتظار الموافقة</SelectItem>
                  <SelectItem value="approved">تمت الموافقة</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="postponed">مؤجل</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="h-11">
                <Filter className="w-4 h-4 ml-2" />
                تصفية
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-700" />
                    الطلبات قيد الانتظار
                  </span>
                  <Badge variant="outline">{filteredRequests.length} طلب</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {filteredRequests.length === 0 && (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                    لا توجد طلبات مطابقة للفلاتر الحالية
                  </div>
                )}

                {filteredRequests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequest(request)}
                    className={`w-full rounded-2xl border p-4 text-right transition-all ${
                      selectedRequest?.id === request.id
                        ? "border-teal-400 bg-teal-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-700" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900">
                              {request.employeeName}
                            </p>
                            <Badge variant="outline">
                              {request.financialNumber}
                            </Badge>
                          </div>

                          <p className="text-sm text-slate-500 mt-1">
                            {request.department}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-3">
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              <Clock className="w-3 h-3 ml-1" />
                              {requestStatusLabels[request.status]}
                            </Badge>

                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              {request.requestType === "emergency"
                                ? "كشف طوارئ"
                                : "كشف عادي"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="text-left text-xs text-slate-500">
                        <p>
                          {new Date(request.createdAt).toLocaleDateString(
                            "ar-EG"
                          )}
                        </p>
                        <p>
                          {new Date(request.createdAt).toLocaleTimeString(
                            "ar-EG",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </section>

          <aside className="xl:col-span-5">
            {selectedRequest ? (
              <Card className="sticky top-28">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>مراجعة الطلب</span>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      {requestStatusLabels[selectedRequest.status]}
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="rounded-2xl bg-slate-50 border p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-[#0B1F3A] text-white flex items-center justify-center font-bold">
                        {selectedRequest.employeeName.slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {selectedRequest.employeeName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {selectedRequest.department}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoItem label="رقم الطلب" value={selectedRequest.id} />
                    <InfoItem
                      label="الرقم المالي"
                      value={selectedRequest.financialNumber}
                    />
                    <InfoItem
                      label="الإدارة"
                      value={selectedRequest.department}
                    />
                    <InfoItem
                      label="نوع الطلب"
                      value={
                        selectedRequest.requestType === "emergency"
                          ? "كشف طوارئ"
                          : "كشف عادي"
                      }
                    />
                    <InfoItem
                      label="تاريخ الطلب"
                      value={new Date(
                        selectedRequest.createdAt
                      ).toLocaleDateString("ar-EG")}
                    />
                    <InfoItem
                      label="وقت الطلب"
                      value={new Date(
                        selectedRequest.createdAt
                      ).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  </div>

                  <div className="rounded-xl border bg-blue-50 p-4">
                    <p className="text-xs text-blue-700 mb-1">سبب الطلب</p>
                    <p className="font-semibold text-blue-950">
                      {selectedRequest.reason}
                    </p>
                  </div>

                  {selectedRequest.notes && (
                    <div className="rounded-xl border bg-white p-4">
                      <p className="text-xs text-slate-500 mb-1">
                        ملاحظات الموظف
                      </p>
                      <p className="text-sm text-slate-800">
                        {selectedRequest.notes}
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5" />
                      <p>
                        الموافقة سترسل الطلب مباشرة إلى الأمن لتسجيل الخروج،
                        والرفض أو الإلغاء يعيد رصيد الكشف للموظف.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Button
                      className="bg-teal-600 hover:bg-teal-700"
                      onClick={() => setActionType("approve")}
                    >
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      موافقة
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => setActionType("reject")}
                    >
                      <XCircle className="w-4 h-4 ml-2" />
                      رفض
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setActionType("postpone")}
                    >
                      <PauseCircle className="w-4 h-4 ml-2" />
                      تأجيل
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full" asChild>
                    <a href={`/requests/${selectedRequest.id}`}>
                      <Eye className="w-4 h-4 ml-2" />
                      عرض تفاصيل الطلب
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  اختر طلبًا من القائمة لمراجعته.
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{actionLabel}</DialogTitle>
            <DialogDescription>
              {selectedRequest &&
                `الطلب ${selectedRequest.id} - ${selectedRequest.employeeName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Label htmlFor="decisionReason">
              {actionType === "approve"
                ? "ملاحظات القرار"
                : actionType === "reject"
                ? "سبب الرفض"
                : "سبب التأجيل"}
            </Label>
            <Textarea
              id="decisionReason"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="اكتب ملاحظات القرار هنا..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              إلغاء
            </Button>

            <Button
              onClick={handleAction}
              className={
                actionType === "approve"
                  ? "bg-teal-600 hover:bg-teal-700"
                  : actionType === "reject"
                  ? ""
                  : "bg-blue-600 hover:bg-blue-700"
              }
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              تأكيد القرار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
