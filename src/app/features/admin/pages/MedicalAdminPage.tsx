import { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  HeartPulse,
  Plus,
  Printer,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth } from "@/app/features/auth/AuthContext";
import { profilesStore } from "@/app/store/profilesStore";
import { requestStore } from "@/app/store/requestStore";
import { useStore } from "@/app/store/reactiveStore";
import { requestStatusLabels } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";
import { toast } from "sonner";

function StatCard({ item }: { item: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg}`}>
            <item.icon className={`h-7 w-7 ${item.color}`} />
          </div>
          <div className="text-left">
            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            <p className="mt-1 text-sm text-slate-500">{item.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestSummaryCard({ request }: { request: MedicalRequest }) {
  return (
    <div className="rounded-2xl border bg-white p-4 transition-all hover:shadow-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-700" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900">{request.employeeName}</h3>
              <Badge variant="outline">{request.financialNumber}</Badge>
              <Badge className="bg-red-100 text-red-700">طوارئ</Badge>
              <Badge className="bg-blue-100 text-blue-700">{requestStatusLabels[request.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">{request.department || "غير محدد"} • {request.id}</p>
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="mb-1 text-xs text-red-700">سبب الطلب</p>
              <p className="text-sm font-medium text-red-950">{request.reason}</p>
            </div>
          </div>
        </div>

        <Button variant="outline" className="border-blue-200 text-blue-700">
          <Printer className="ml-2 h-4 w-4" />
          طباعة ملخص
        </Button>
      </div>
    </div>
  );
}

function ReferralCard({ request, onApprove, onReject }: { request: MedicalRequest; onApprove: () => void; onReject: () => void }) {
  const ref = request.referralData!;
  const priorityLabel = ref.priority === "emergency" ? "طارئ" : ref.priority === "urgent" ? "عاجل" : "عادي";
  const priorityClass = ref.priority === "emergency" ? "bg-red-100 text-red-700" : ref.priority === "urgent" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";

  return (
    <div className="rounded-2xl border bg-white p-4 hover:shadow-md transition">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 flex-shrink-0">
            <ExternalLink className="h-6 w-6 text-violet-700" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900">{request.employeeName}</h3>
              <Badge variant="outline">{request.financialNumber}</Badge>
              <Badge className={priorityClass}>{priorityLabel}</Badge>
              <Badge className="bg-slate-100 text-slate-700">{ref.specialty}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">{request.department || "غير محدد"} • {request.id}</p>
            <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">سبب التحويل: </span>{ref.reason}</p>
            {ref.facility && <p className="text-xs text-slate-500 mt-1">الجهة المقترحة: {ref.facility}</p>}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onApprove}>
            <CheckCircle2 className="ml-2 h-4 w-4" />
            اعتماد
          </Button>
          <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={onReject}>
            <XCircle className="ml-2 h-4 w-4" />
            رفض
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateEmergencyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { createRequest, refreshRequests } = useWorkflow();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allEmployees = useStore(profilesStore, (s) => s.getAll()).filter(
    (u) => u.role === "employee",
  );
  const filtered = allEmployees.filter((e) => {
    const term = search.trim().toLowerCase();
    return !term || e.name.toLowerCase().includes(term) || e.financialNumber?.toLowerCase().includes(term);
  }).slice(0, 20);

  const selected = allEmployees.find((e) => e.id === selectedId);

  const handleSubmit = () => {
    if (!selected || !reason.trim()) {
      toast.error("برجاء اختيار الموظف وكتابة سبب الطوارئ");
      return;
    }

    setSubmitting(true);
    const now = new Date().toISOString();
    const id = `REQ-${Date.now()}`;

    const req: MedicalRequest = {
      id,
      employeeId: selected.id,
      employeeName: selected.name,
      financialNumber: selected.financialNumber || "",
      department: selected.department || "",
      reason: reason.trim(),
      serviceType: "checkup",
      requestType: "emergency",
      status: "approved",
      createdAt: now,
      approvedAt: now,
      jobTitle: selected.jobTitle,
      workType: selected.workType,
      managerName: user?.name,
      managerId: user?.id,
    };

    createRequest(req);
    toast.success(`تم فتح طلب طوارئ باسم ${selected.name}`, { description: "الطلب جاهز للخروج من الأمن" });
    setSearch("");
    setSelectedId("");
    setReason("");
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            إنشاء طلب طوارئ بالنيابة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">بحث عن الموظف</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedId(""); }}
                className="pr-10"
                placeholder="اسم الموظف أو الرقم المالي..."
              />
            </div>

            {search && !selectedId && (
              <div className="mt-2 max-h-48 overflow-auto rounded-xl border bg-white shadow-sm">
                {filtered.length === 0 && (
                  <p className="p-3 text-center text-sm text-slate-500">لا توجد نتائج</p>
                )}
                {filtered.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="flex w-full items-center gap-3 p-3 text-right hover:bg-slate-50 border-b last:border-0"
                    onClick={() => { setSelectedId(e.id); setSearch(e.name); }}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">{e.financialNumber} • {e.department || "غير محدد"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-2 rounded-xl border border-green-200 bg-green-50 p-3">
                <p className="font-bold text-green-900">{selected.name}</p>
                <p className="text-xs text-green-700">{selected.financialNumber} • {selected.department || "غير محدد"}</p>
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 block">سبب الطوارئ <span className="text-red-600">*</span></Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="وصف الحالة الطارئة..."
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            سيتم إنشاء طلب طوارئ معتمداً مباشرةً ويكون جاهزاً لتسجيل الخروج من الأمن.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={!selected || !reason.trim() || submitting}
            onClick={handleSubmit}
          >
            <AlertTriangle className="ml-2 h-4 w-4" />
            فتح طلب طوارئ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MedicalAdminPage() {
  const { requests } = useWorkflow();
  const [emergencySearch, setEmergencySearch] = useState("");
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [, forceRender] = useState(0);

  const today = new Date();
  const todayRequests = requests.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  });

  const emergencyRequests = requests.filter((r) => r.requestType === "emergency");
  const completedRequests = requests.filter((r) => ["completed", "monthly_completed"].includes(r.status));
  const monthlyRequests = requests.filter((r) => r.serviceType === "monthly_treatment");
  const pendingMonthly = requests.filter((r) => r.status === "pending_monthly_doctor");

  const pendingReferrals = useMemo(
    () => requests.filter((r) => r.referralData?.status === "pending_admin"),
    [requests]
  );

  const filteredEmergencies = useMemo(() => {
    const term = emergencySearch.trim().toLowerCase();
    return emergencyRequests.filter(
      (r) =>
        !term ||
        r.employeeName.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term)
    );
  }, [emergencyRequests, emergencySearch]);


  const handleApproveReferral = (requestId: string) => {
    requestStore.updateFields(requestId, {
      referralData: {
        ...requests.find((r) => r.id === requestId)!.referralData!,
        status: "approved",
        reviewedAt: new Date().toISOString(),
      },
    });
    toast.success("تم اعتماد التحويل الخارجي");
    forceRender((v) => v + 1);
  };

  const handleRejectReferral = (requestId: string) => {
    requestStore.updateFields(requestId, {
      referralData: {
        ...requests.find((r) => r.id === requestId)!.referralData!,
        status: "rejected",
        reviewedAt: new Date().toISOString(),
      },
    });
    toast.success("تم رفض التحويل");
    forceRender((v) => v + 1);
  };

  const stats = [
    { label: "طلبات اليوم", value: todayRequests.length, icon: Activity, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "حالات طوارئ", value: emergencyRequests.length, icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50" },
    { label: "تحويلات معلقة", value: pendingReferrals.length, icon: ExternalLink, color: "text-violet-700", bg: "bg-violet-50" },
    { label: "عمليات مكتملة", value: completedRequests.length, icon: CheckCircle2, color: "text-teal-700", bg: "bg-teal-50" },
  ];

  return (
    <PageLayout
      title="الإدارة الطبية"
      subtitle="متابعة الحالات الطبية والقرارات الرسمية"
      icon={<HeartPulse className="h-5 w-5" />}
      backLink="/dashboard"
    >
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-l from-[#0B1F3A] to-[#0D9488] p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">لوحة الإدارة الطبية</p>
              <h2 className="mt-1 text-2xl font-bold">مراجعة ومتابعة الطلبات الطبية الفعلية</h2>
            </div>
            <Button
              className="bg-red-600 hover:bg-red-700 border-0"
              onClick={() => setShowEmergencyDialog(true)}
            >
              <Plus className="ml-2 h-4 w-4" />
              طوارئ بالنيابة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {stats.map((item) => <StatCard key={item.label} item={item} />)}
        </div>

        <Tabs defaultValue="emergency" dir="rtl">
          <TabsList className="mb-4 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            <TabsTrigger value="emergency" className="gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              الطوارئ ({emergencyRequests.length})
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              التحويلات ({pendingReferrals.length})
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              الملخص التشغيلي
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emergency">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-700" />
                    حالات الطوارئ
                  </span>
                  <Badge variant="outline">{emergencyRequests.length} حالة</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="h-11 pr-10"
                      placeholder="بحث باسم الموظف أو رقم الطلب..."
                      value={emergencySearch}
                      onChange={(e) => setEmergencySearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="h-11">تصدير القائمة</Button>
                </div>

                <div className="space-y-4">
                  {filteredEmergencies.length === 0 && (
                    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                      لا توجد حالات طوارئ مسجلة.
                    </div>
                  )}
                  {filteredEmergencies.map((r) => <RequestSummaryCard key={r.id} request={r} />)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-violet-700" />
                  التحويلات الخارجية المعلقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingReferrals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                    لا توجد تحويلات خارجية بانتظار المراجعة.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingReferrals.map((r) => (
                      <ReferralCard
                        key={r.id}
                        request={r}
                        onApprove={() => handleApproveReferral(r.id)}
                        onReject={() => handleRejectReferral(r.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-blue-700" />
                    ملخص تشغيلي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {[
                    ["كشوف عادية", requests.filter((r) => r.serviceType !== "monthly_treatment" && r.requestType !== "emergency").length],
                    ["كشوف طوارئ", emergencyRequests.length],
                    ["علاج شهري", monthlyRequests.length],
                    ["بانتظار طبيب شهري", pendingMonthly.length],
                    ["جاهز للصيدلية", requests.filter((r) => ["prescribed", "monthly_ready_pharmacy"].includes(r.status)).length],
                    ["تحويلات معتمدة", requests.filter((r) => r.referralData?.status === "approved").length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between border-b pb-3">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-bold text-[#0B1F3A]">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardCheck className="h-5 w-5 text-teal-700" />
                    إجراءات سريعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2">
                  <Button variant="outline" onClick={() => setShowEmergencyDialog(true)}>
                    <AlertTriangle className="ml-2 h-4 w-4 text-red-600" />
                    فتح طلب طوارئ بالنيابة
                  </Button>
                  <Button variant="outline">
                    <FileText className="ml-2 h-4 w-4" />
                    تصدير تقرير اليوم
                  </Button>
                  <Button variant="outline">
                    <Printer className="ml-2 h-4 w-4" />
                    طباعة سجل الطوارئ
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateEmergencyDialog
        open={showEmergencyDialog}
        onClose={() => setShowEmergencyDialog(false)}
      />
    </PageLayout>
  );
}