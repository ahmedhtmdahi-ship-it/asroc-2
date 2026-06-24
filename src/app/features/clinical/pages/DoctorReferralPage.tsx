import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Send,
  Stethoscope,
  User,
} from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStore } from "@/app/store/requestStore";
import { requestStatusLabels } from "@/app/types/workflow";
import { toast } from "sonner";

const specialties = [
  { value: "internal", label: "باطنة" },
  { value: "heart", label: "قلب" },
  { value: "bones", label: "عظام" },
  { value: "eyes", label: "عيون" },
  { value: "ent", label: "أنف وأذن وحنجرة" },
  { value: "surgery", label: "جراحة" },
  { value: "neuro", label: "أعصاب" },
  { value: "skin", label: "جلدية" },
  { value: "urology", label: "مسالك بولية" },
  { value: "gastro", label: "جهاز هضمي" },
];

export function DoctorReferralPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { requests } = useWorkflow();
  const request = requests.find((item) => item.id === id);

  const [specialty, setSpecialty] = useState("");
  const [priority, setPriority] = useState("normal");
  const [facility, setFacility] = useState("");
  const [externalDoctor, setExternalDoctor] = useState("");
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!specialty || !reason.trim()) {
      toast.error("برجاء تحديد التخصص وكتابة سبب التحويل");
      return;
    }

    setSubmitting(true);

    requestStore.updateFields(request!.id, {
      referralData: {
        specialty,
        priority,
        facility: facility.trim(),
        externalDoctor: externalDoctor.trim() || undefined,
        reason: reason.trim(),
        adminNotes: adminNotes.trim() || undefined,
        status: "pending_admin",
        submittedAt: new Date().toISOString(),
      },
    });

    toast.success("تم إرسال التحويل إلى الإدارة الطبية للمراجعة", {
      description: "ستتلقى إشعاراً بعد الاعتماد أو الرفض",
    });

    setSubmitting(false);
    navigate("/doctor");
  };

  if (!request) {
    return (
      <PageLayout
        title="إنشاء تحويل خارجي"
        subtitle="الطلب غير موجود"
        icon={<FileText className="w-5 h-5" />}
        backLink="/doctor"
      >
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-lg font-bold text-slate-800">لم يتم العثور على الطلب</p>
            <p className="mt-2 text-sm text-slate-500">لا يمكن إنشاء تحويل خارجي بدون طلب كشف فعلي.</p>
            <Button asChild className="mt-5">
              <Link to="/doctor">
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة لقائمة الطبيب
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const isEmergency = request.requestType === "emergency";
  const alreadyReferred = !!request.referralData;

  return (
    <PageLayout
      title="إنشاء تحويل خارجي"
      subtitle={`طلب رقم ${request.id}`}
      icon={<FileText className="w-5 h-5" />}
      backLink="/doctor"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <aside className="xl:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-5 h-5 text-blue-700" />
                بيانات المريض
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ["الاسم", request.employeeName],
                ["الرقم المالي", request.financialNumber],
                ["الإدارة", request.department || "غير محدد"],
                ["نوع الطلب", isEmergency ? "كشف طوارئ" : "كشف عادي"],
                ["الحالة", requestStatusLabels[request.status]],
                ["رقم الطلب", request.id],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b pb-3">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-bold text-slate-900">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="w-5 h-5 text-teal-700" />
                ملخص الكشف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl bg-slate-50 border p-3">
                <p className="font-bold text-slate-900">الشكوى</p>
                <p className="mt-1 text-slate-600">{request.reason}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border p-3">
                <p className="font-bold text-slate-900">التشخيص المبدئي</p>
                <p className="mt-1 text-slate-600">
                  {request.doctorDiagnosis || "لم يتم تسجيل تشخيص منظم بعد."}
                </p>
              </div>
            </CardContent>
          </Card>

          {alreadyReferred && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 text-sm text-amber-800">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">تم إرسال تحويل سابق لهذا الطلب</p>
                    <p className="mt-1">
                      التخصص: {specialties.find((s) => s.value === request.referralData?.specialty)?.label || request.referralData?.specialty}
                    </p>
                    <Badge className={
                      request.referralData?.status === "approved"
                        ? "mt-2 bg-green-100 text-green-700"
                        : request.referralData?.status === "rejected"
                        ? "mt-2 bg-red-100 text-red-700"
                        : "mt-2 bg-yellow-100 text-yellow-700"
                    }>
                      {request.referralData?.status === "approved" ? "معتمد" :
                       request.referralData?.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        <main className="xl:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-violet-700" />
                بيانات التحويل الخارجي
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>التخصص المطلوب <span className="text-red-600">*</span></Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger className="h-11 mt-1">
                      <SelectValue placeholder="اختر التخصص" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>درجة الأولوية</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-11 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">عادي</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
                      <SelectItem value="emergency">طارئ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>الجهة المقترحة</Label>
                  <Input
                    className="mt-1"
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                    placeholder="اسم المستشفى / المركز الطبي"
                  />
                </div>

                <div>
                  <Label>الطبيب الخارجي المقترح</Label>
                  <Input
                    className="mt-1"
                    value={externalDoctor}
                    onChange={(e) => setExternalDoctor(e.target.value)}
                    placeholder="اختياري"
                  />
                </div>
              </div>

              <div>
                <Label>سبب التحويل <span className="text-red-600">*</span></Label>
                <Textarea
                  rows={4}
                  className="mt-1"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اكتب سبب التحويل الخارجي والتوصية الطبية..."
                />
              </div>

              <div>
                <Label>ملاحظات للإدارة الطبية</Label>
                <Textarea
                  rows={3}
                  className="mt-1"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="أي ملاحظات تساعد الإدارة الطبية في مراجعة التحويل..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-violet-200 bg-violet-50">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-violet-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-violet-900">بعد الإرسال</p>
                  <p className="mt-1 text-sm text-violet-800">
                    سيتم إرسال التحويل إلى الإدارة الطبية للموافقة أو الرفض. يمكن متابعة الحالة من صفحة المدير الطبي.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row gap-3 justify-end">
            <Button variant="outline" asChild>
              <Link to="/doctor">
                <ArrowRight className="w-4 h-4 ml-2" />
                رجوع
              </Link>
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !specialty || !reason.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Send className="w-4 h-4 ml-2" />
              إرسال للإدارة الطبية
            </Button>
          </div>
        </main>
      </div>
    </PageLayout>
  );
}
