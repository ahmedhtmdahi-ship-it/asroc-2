import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowRight,
  Building2,
  FileText,
  Printer,
  Send,
  Stethoscope,
  User,
} from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
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
import { useAuth } from "@/app/features/auth/AuthContext";
import { checkupService } from "@/app/services/checkupService";
import { apiClient } from "@/app/services/apiClient";
import { requestStatusLabels } from "@/app/types/workflow";
import { toast } from "sonner";

type Provider = { id: number; name: string; specialty: string; type: string };

export function DoctorReferralPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { requests, refreshRequests } = useWorkflow();
  const { isApiConnected } = useAuth();
  const request = requests.find((item) => item.id === id);

  const [specialty, setSpecialty]             = useState("");
  const [providerId, setProviderId]           = useState("");
  const [reason, setReason]                   = useState("");
  const [notes, setNotes]                     = useState("");
  const [providers, setProviders]             = useState<Provider[]>([]);

  useEffect(() => {
    if (isApiConnected) {
      apiClient.get("/external-providers?per_page=100").then((res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        setProviders(items);
      }).catch(() => {});
    }
  }, [isApiConnected]);

  const handleSubmit = async () => {
    if (!request) return;
    if (!specialty.trim() || !reason.trim()) {
      toast.error("التخصص وسبب التحويل مطلوبان");
      return;
    }
    if (isApiConnected && !providerId) {
      toast.error("برجاء اختيار الجهة الخارجية");
      return;
    }
    try {
      if (isApiConnected) {
        await checkupService.writeReferral(Number(request.id), {
          external_provider_id: Number(providerId),
          specialty,
          reason,
          notes: notes || undefined,
        });
        refreshRequests();
      }
      toast.success("تم إرسال التحويل إلى الإدارة الطبية للمراجعة");
      navigate("/doctor");
    } catch (err) {
      toast.error("تعذر إرسال التحويل", {
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      });
    }
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
            <p className="mt-2 text-sm text-slate-500">
              لا يمكن إنشاء تحويل خارجي بدون طلب كشف فعلي.
            </p>
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
                <p className="mt-1 text-slate-600">
                  {request.reason}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border p-3">
                <p className="font-bold text-slate-900">التشخيص المبدئي</p>
                <p className="mt-1 text-slate-600">
                  {request.doctorDiagnosis || "لم يتم تسجيل تشخيص منظم بعد."}
                </p>
              </div>
            </CardContent>
          </Card>
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
                  <Input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="مثال: باطنة / قلب / عظام..."
                    className="h-11"
                  />
                </div>

                <div>
                  <Label>الجهة الخارجية {isApiConnected && <span className="text-red-600">*</span>}</Label>
                  {providers.length > 0 ? (
                    <Select value={providerId} onValueChange={setProviderId}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="اختر الجهة" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} — {p.specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={providerId}
                      onChange={(e) => setProviderId(e.target.value)}
                      placeholder="رقم / اسم الجهة الخارجية"
                      className="h-11"
                    />
                  )}
                </div>
              </div>

              <div>
                <Label>سبب التحويل <span className="text-red-600">*</span></Label>
                <Textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اكتب سبب التحويل الخارجي والتوصية الطبية..."
                />
              </div>

              <div>
                <Label>ملاحظات للإدارة الطبية</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات تساعد الإدارة الطبية في مراجعة التحويل..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-violet-200 bg-violet-50">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-violet-700 mt-0.5" />
                <div>
                  <p className="font-bold text-violet-900">
                    بعد الإرسال
                  </p>
                  <p className="mt-1 text-sm text-violet-800">
                    سيتم إرسال التحويل إلى الإدارة الطبية للموافقة أو الرفض، وبعد الموافقة يتم توليد PDF رسمي للطباعة.
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

            <Button onClick={handleSubmit} className="bg-teal-600 hover:bg-teal-700">
              <Send className="w-4 h-4 ml-2" />
              إرسال للإدارة الطبية
            </Button>
          </div>
        </main>
      </div>
    </PageLayout>
  );
}
