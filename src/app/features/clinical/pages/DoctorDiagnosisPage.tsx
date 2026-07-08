import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  FileText,
  HeartPulse,
  Pill,
  Plus,
  Save,
  Send,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStatusLabels } from "@/app/types/workflow";
import { toast } from "sonner";

import { medicineStore } from "@/app/store/medicineStore";
import { requestStore } from "@/app/store/requestStore";
import { useStore } from "@/app/store/reactiveStore";
import type { PrescriptionMedication } from "@/app/types/request";

type Medication = {
  medicationId: string;
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
};


export function DoctorDiagnosisPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { requests, refreshRequests } = useWorkflow();
  const request = requests.find((item) => item.id === params.id);
  const medicines = useStore(medicineStore, (s) => s.getAll());

  const [complaint, setComplaint] = useState(request?.reason || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  const [temperature, setTemperature] = useState("");
  const [pressure, setPressure] = useState("");
  const [pulse, setPulse] = useState("");

  const [medications, setMedications] = useState<Medication[]>([
    {
      medicationId: "",
      name: "",
      dosage: "",
      duration: "",
      instructions: "",
    },
  ]);


  const [sickLeaveDays, setSickLeaveDays] = useState("");
  const [sickLeaveReason, setSickLeaveReason] = useState("");

  const [referralSpecialty, setReferralSpecialty] = useState("");
  const [referralPlace, setReferralPlace] = useState("");
  const [referralReason, setReferralReason] = useState("");

  const addMedication = () => {
    setMedications([
      ...medications,
      {
        medicationId: "",
        name: "",
        dosage: "",
        duration: "",
        instructions: "",
      },
    ]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSave = async () => {
    if (!request) return;

    if (!diagnosis.trim()) {
      toast.error("برجاء تسجيل التشخيص الطبي قبل إرسال الطلب للصيدلية");
      return;
    }

    const filledMedications = medications.filter((med) => med.name.trim());

    if (filledMedications.length === 0) {
      toast.error("برجاء إضافة دواء واحد على الأقل في الروشتة");
      return;
    }

    if (request.status !== "checked_out" && request.status !== "in_diagnosis") {
      toast.error("لا يمكن إرسال هذا الطلب للصيدلية من حالته الحالية", {
        description: requestStatusLabels[request.status],
      });
      return;
    }

    const structuredMeds: PrescriptionMedication[] = filledMedications.map((med) => ({
      id: med.medicationId || `med-${Date.now()}-${Math.random()}`,
      name: med.name,
      dosage: med.dosage,
      duration: med.duration,
      instructions: med.instructions,
    }));

    try {
      // تسلسل النداءات على السيرفر (كل خطوة بتنتظر اللي قبلها) عشان الـ workflow
      // ما يتسابقش: بدء الكشف → حفظ التشخيص/الروشتة → إرسال للصيدلية.
      if (request.status === "checked_out") {
        await requestStore.transitionAsync(
          request.id,
          "in_diagnosis",
          "بدأ الطبيب جلسة الكشف الطبي",
        );
      }

      await requestStore.patchAsync(request.id, {
        doctorDiagnosis: diagnosis.trim(),
        medications: structuredMeds,
        sickLeaveDays: sickLeaveDays ? Number(sickLeaveDays) : undefined,
        sickLeaveReason: sickLeaveReason.trim() || undefined,
      });

      await requestStore.transitionAsync(
        request.id,
        "prescribed",
        `التشخيص: ${diagnosis.trim()} | الأدوية: ${filledMedications.map((med) => `${med.name} ${med.dosage}`.trim()).join("، ")}`,
      );

      refreshRequests();
      toast.success("تم حفظ الكشف وإرسال الروشتة للصيدلية", {
        description: "تم تحديث حالة الطلب وإضافة التشخيص الطبي.",
      });
      navigate("/pharmacy");
    } catch (error) {
      refreshRequests();
      toast.error("تعذر حفظ الكشف", {
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      });
    }
  };

  if (!request) {
    return (
      <PageLayout
        title="محطة الكشف الطبي"
        subtitle="الطلب غير موجود"
        icon={<Stethoscope className="w-5 h-5" />}
        backLink="/doctor"
      >
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-lg font-bold text-slate-800">لم يتم العثور على الطلب</p>
            <p className="mt-2 text-sm text-slate-500">
              قد يكون الطلب غير موجود أو تم تحديث قائمة الانتظار.
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
  const requestTypeLabel = isEmergency ? "كشف طوارئ" : "كشف عادي";
  const arrivalTime = new Date(request.createdAt).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const previousVisits = requests
    .filter(
      (item) =>
        item.id !== request.id &&
        item.financialNumber === request.financialNumber &&
        item.serviceType !== "monthly_treatment"
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  return (
    <PageLayout
      title="محطة الكشف الطبي"
      subtitle={`طلب رقم ${request.id}`}
      icon={<Stethoscope className="w-5 h-5" />}
      backLink="/doctor"
    >
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-l from-[#0B1F3A] to-[#0D9488] p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">جلسة كشف نشطة</p>
              <h2 className="mt-1 text-2xl font-bold">{request.employeeName}</h2>
              <p className="mt-1 text-white/80">
                {request.financialNumber} • {request.department || "غير محدد"} • {requestTypeLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                {requestTypeLabel}
              </Badge>
              <Badge className="bg-white/15 text-white border-white/20">
                وصل {arrivalTime}
              </Badge>
              <Badge className="bg-white/15 text-white border-white/20">
                {requestStatusLabels[request.status]}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <aside className="xl:col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-700" />
                  بيانات المريض
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["الاسم", request.employeeName],
                  ["الرقم المالي", request.financialNumber],
                  ["الإدارة", request.department || "غير محدد"],
                  ["الوظيفة", request.jobTitle || "غير محدد"],
                  ["نوع الطلب", requestTypeLabel],
                  ["رقم الطلب", request.id],
                  ["الحالة", requestStatusLabels[request.status]],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b pb-3">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-red-700" />
                  العلامات الحيوية
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <div>
                  <Label>درجة الحرارة</Label>
                  <Input
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="37.2"
                  />
                </div>
                <div>
                  <Label>ضغط الدم</Label>
                  <Input
                    value={pressure}
                    onChange={(e) => setPressure(e.target.value)}
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <Label>النبض</Label>
                  <Input
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="80"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-700" />
                  زيارات سابقة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {previousVisits.length === 0 && (
                  <div className="rounded-xl border border-dashed bg-white p-4 text-center text-xs text-slate-500">
                    لا توجد زيارات سابقة مسجلة لهذا الموظف.
                  </div>
                )}

                {previousVisits.map((visit) => (
                  <div key={visit.id} className="rounded-xl border bg-slate-50 p-3">
                    <p className="font-bold text-sm">
                      {new Date(visit.createdAt).toLocaleDateString("ar-EG")}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{visit.reason}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      الحالة: {requestStatusLabels[visit.status]}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>

          <main className="xl:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-700" />
                  التشخيص الطبي
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>شكوى المريض</Label>
                  <Textarea
                    rows={3}
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    التشخيص <span className="text-red-600">*</span>
                  </Label>
                  <Textarea
                    rows={5}
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="اكتب التشخيص الطبي..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات الطبيب</Label>
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="تعليمات أو ملاحظات إضافية..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="w-5 h-5 text-purple-700" />
                    الروشتة الطبية
                  </CardTitle>

                  <Button variant="outline" size="sm" onClick={addMedication}>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة دواء
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {medications.map((med, index) => (
                  <div key={index} className="rounded-2xl border bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="outline">دواء رقم {index + 1}</Badge>
                      {medications.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => removeMedication(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>اسم الدواء</Label>
                        <Select
                          value={med.medicationId}
                          onValueChange={(value) => {
                            const selected = medicines.find(
                              (m) => m.id === value
                            );
                            updateMedication(index, "medicationId", value);
                            if (selected) {
                              updateMedication(index, "name", selected.name);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الدواء" />
                          </SelectTrigger>
                          <SelectContent>
                            {medicines
                              .filter((m) => m.isActive)
                              .map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>


                      <div>
                        <Label>الجرعة</Label>
                        <Input
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                          placeholder="الجرعة"
                        />
                      </div>

                      <div>
                        <Label>المدة</Label>
                        <Input
                          value={med.duration}
                          onChange={(e) => updateMedication(index, "duration", e.target.value)}
                          placeholder="المدة"
                        />
                      </div>

                      <div>
                        <Label>تعليمات الاستخدام</Label>
                        <Input
                          value={med.instructions}
                          onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                          placeholder="تعليمات الاستخدام"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-red-700" />
                    إجازة مرضية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>عدد الأيام</Label>
                    <Input
                      type="number"
                      value={sickLeaveDays}
                      onChange={(e) => setSickLeaveDays(e.target.value)}
                      placeholder="مثال: 2"
                    />
                  </div>
                  <div>
                    <Label>سبب الإجازة</Label>
                    <Textarea
                      rows={3}
                      value={sickLeaveReason}
                      onChange={(e) => setSickLeaveReason(e.target.value)}
                      placeholder="سبب الراحة المرضية..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="w-5 h-5 text-violet-700" />
                    تحويل خارجي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>التخصص المطلوب</Label>
                    <Select value={referralSpecialty} onValueChange={setReferralSpecialty}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر التخصص" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eyes">عيون</SelectItem>
                        <SelectItem value="heart">قلب</SelectItem>
                        <SelectItem value="bones">عظام</SelectItem>
                        <SelectItem value="ent">أنف وأذن</SelectItem>
                        <SelectItem value="internal">باطنة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>الجهة / الطبيب الخارجي</Label>
                    <Input
                      value={referralPlace}
                      onChange={(e) => setReferralPlace(e.target.value)}
                      placeholder="اسم المستشفى أو الطبيب"
                    />
                  </div>

                  <div>
                    <Label>سبب التحويل</Label>
                    <Textarea
                      rows={3}
                      value={referralReason}
                      onChange={(e) => setReferralReason(e.target.value)}
                      placeholder="سبب التحويل الخارجي..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div className="flex items-start gap-3 text-sm text-yellow-800">
                    <AlertTriangle className="w-5 h-5 mt-0.5" />
                    <p>
                      عند حفظ الكشف سيتم تحديث حالة الطلب، وإرسال الروشتة إلى الصيدلية،
                      والتحويل الخارجي إلى الإدارة الطبية إن وجد.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" asChild>
                      <Link to="/doctor">
                        <ArrowRight className="w-4 h-4 ml-2" />
                        رجوع
                      </Link>
                    </Button>

                    <Button variant="outline">
                      <Save className="w-4 h-4 ml-2" />
                      حفظ كمسودة
                    </Button>

                    <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      حفظ وإرسال للصيدلية
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </PageLayout>
  );
}
