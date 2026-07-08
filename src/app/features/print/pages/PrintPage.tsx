import { useMemo, useState } from "react";
import { BedDouble, ClipboardList, FileText, Pill, Printer, Search } from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { profilesStore } from "@/app/store/profilesStore";
import { useStore } from "@/app/store/reactiveStore";
import { requestStatusLabels } from "@/app/types/workflow";
import type { MedicalRequest } from "@/app/types/request";

function requestKind(request: MedicalRequest) {
  if (request.serviceType === "monthly_treatment") {
    return request.monthlyTreatmentType === "renewal" ? "تجديد علاج شهري" : "علاج شهري جديد";
  }

  return request.requestType === "emergency" ? "كشف طوارئ" : "كشف عادي";
}

function formatDate(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";

  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getDoctorName(request: MedicalRequest) {
  const doctor = request.doctorId
    ? profilesStore.getById(request.doctorId)
    : profilesStore.getByRole("doctor")[0];

  return doctor?.name || "الطبيب المختص";
}

function PrintControls({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between print:hidden">
      <h3 className="font-semibold text-slate-700">{title}</h3>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="ml-2 h-4 w-4" />
        طباعة
      </Button>
    </div>
  );
}

function RequestSelector({
  requests,
  selectedId,
  onSelect,
}: {
  requests: MedicalRequest[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = requests
    .filter((request) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;

      return (
        request.id.toLowerCase().includes(term) ||
        request.employeeName.toLowerCase().includes(term) ||
        request.financialNumber.toLowerCase().includes(term)
      );
    })
    .slice(0, 30);

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-5 w-5 text-blue-700" />
          اختيار طلب للطباعة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث برقم الطلب أو الاسم أو الرقم المالي..."
        />

        <div className="max-h-80 space-y-2 overflow-auto">
          {filtered.map((request) => (
            <button
              key={request.id}
              type="button"
              onClick={() => onSelect(request.id)}
              className={`w-full rounded-xl border p-3 text-right transition ${
                selectedId === request.id ? "border-teal-400 bg-teal-50" : "bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{request.employeeName}</p>
                  <p className="text-xs text-slate-500">
                    {request.id} • {request.financialNumber}
                  </p>
                </div>
                <Badge variant="outline">{requestKind(request)}</Badge>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OfficialHeader({ title, documentNo }: { title: string; documentNo: string }) {
  return (
    <div className="mb-6 border-b-2 border-slate-800 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ASORC</h1>
          <p className="text-sm text-slate-600">نظام إدارة الخدمات الطبية</p>
          <p className="text-xs text-slate-500">وحدة الخدمات الطبية بالشركة</p>
        </div>
        <div className="rounded border border-slate-300 p-3 text-center">
          <p className="text-xs text-slate-500">رقم المستند</p>
          <p className="font-mono text-sm font-bold text-blue-700">{documentNo}</p>
        </div>
      </div>

      <div className="mt-5 text-center">
        <h2 className="text-2xl font-bold underline">{title}</h2>
      </div>
    </div>
  );
}

function PatientBlock({ request }: { request: MedicalRequest }) {
  return (
    <div className="mb-5 rounded-lg border p-4">
      <h3 className="mb-3 border-b pb-1 font-bold text-slate-800">بيانات المستفيد</h3>
      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <InfoLine label="الاسم" value={request.employeeName} />
        <InfoLine label="الرقم المالي" value={request.financialNumber} />
        <InfoLine label="الإدارة" value={request.department || "غير محدد"} />
        <InfoLine label="نوع الطلب" value={requestKind(request)} />
        <InfoLine label="رقم الطلب" value={request.id} />
        <InfoLine label="تاريخ الطلب" value={formatDate(request.createdAt)} />
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 flex-shrink-0 text-slate-500">{label}:</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function RequestSummaryPrint({ request }: { request: MedicalRequest }) {
  return (
    <div>
      <PrintControls title="معاينة ملخص الطلب" />
      <PrintableShell>
        <OfficialHeader title="ملخص طلب طبي" documentNo={`DOC-${request.id}`} />
        <PatientBlock request={request} />

        <div className="mb-5 rounded-lg border p-4">
          <h3 className="mb-3 border-b pb-1 font-bold text-slate-800">بيانات الطلب</h3>
          <div className="space-y-3 text-sm">
            <InfoLine label="الحالة" value={requestStatusLabels[request.status]} />
            <InfoLine label="السبب" value={request.reason} />
            <InfoLine label="ملاحظات" value={request.notes || "لا توجد"} />
          </div>
        </div>

        <SignatureBlock first="الموظف المختص" second="اعتماد الإدارة الطبية" />
      </PrintableShell>
    </div>
  );
}

function PrescriptionPrint({ request }: { request: MedicalRequest }) {
  const meds = request.medications || [];

  return (
    <div>
      <PrintControls title="معاينة الوصفة الطبية" />
      <PrintableShell>
        <OfficialHeader title="وصفة طبية" documentNo={`RX-${request.id}`} />
        <PatientBlock request={request} />

        <div className="mb-5 rounded-lg border p-4">
          <h3 className="mb-3 border-b pb-1 font-bold text-slate-800">بيانات الكشف</h3>
          <div className="space-y-3 text-sm">
            <InfoLine label="الطبيب" value={getDoctorName(request)} />
            <InfoLine label="التشخيص" value={request.doctorDiagnosis || request.reason || "غير مسجل"} />
            {request.sickLeaveDays && (
              <InfoLine label="إجازة مرضية" value={`${request.sickLeaveDays} يوم — ${request.sickLeaveReason || "راحة طبية"}`} />
            )}
          </div>
        </div>

        {meds.length > 0 ? (
          <div className="mb-5 rounded-lg border p-4">
            <h3 className="mb-3 border-b pb-1 font-bold text-slate-800">الأدوية الموصوفة</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700">
                    <th className="border p-2 text-right">#</th>
                    <th className="border p-2 text-right">اسم الدواء</th>
                    <th className="border p-2 text-right">الجرعة</th>
                    <th className="border p-2 text-right">المدة</th>
                    <th className="border p-2 text-right">تعليمات</th>
                  </tr>
                </thead>
                <tbody>
                  {meds.map((med, i) => (
                    <tr key={med.id} className="even:bg-slate-50">
                      <td className="border p-2 text-center">{i + 1}</td>
                      <td className="border p-2 font-semibold">{med.name}</td>
                      <td className="border p-2">{med.dosage || "—"}</td>
                      <td className="border p-2">{med.duration || "—"}</td>
                      <td className="border p-2 text-slate-600">{med.instructions || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">
            لا تتوفر بيانات أدوية منظمة لهذا الطلب.
          </div>
        )}

        <SignatureBlock first="توقيع الطبيب" second="ختم الصيدلية" />
      </PrintableShell>
    </div>
  );
}

function MonthlyTreatmentPrint({ request }: { request: MedicalRequest }) {
  return (
    <div>
      <PrintControls title="معاينة نموذج العلاج الشهري" />
      <PrintableShell>
        <OfficialHeader title="نموذج علاج شهري" documentNo={`MT-${request.id}`} />
        <PatientBlock request={request} />

        <div className="mb-5 rounded-lg border p-4">
          <h3 className="mb-3 border-b pb-1 font-bold text-slate-800">بيانات العلاج الشهري</h3>
          <div className="space-y-3 text-sm">
            <InfoLine
              label="نوع المعاملة"
              value={request.monthlyTreatmentType === "renewal" ? "تجديد علاج شهري" : "علاج شهري جديد"}
            />
            <InfoLine label="الطبيب المسؤول" value={request.monthlyDoctorName || "غير محدد"} />
            <InfoLine label="الحالة" value={requestStatusLabels[request.status]} />
            <InfoLine label="ملاحظات" value={request.notes || "لا توجد"} />
          </div>
        </div>

        <SignatureBlock first="الطبيب المختص" second="الصيدلية" />
      </PrintableShell>
    </div>
  );
}

function SickLeavePrint({ request }: { request: MedicalRequest }) {
  return (
    <div>
      <PrintControls title="معاينة الإجازة المرضية" />
      <PrintableShell>
        <OfficialHeader title="إفادة طبية / إجازة مرضية" documentNo={`SL-${request.id}`} />
        <PatientBlock request={request} />

        <div className="mb-5 rounded-lg border p-4">
          <p className="leading-8 text-slate-700">
            تفيد وحدة الخدمات الطبية بأن الموظف المذكور بياناته أعلاه تم توقيع الكشف الطبي عليه
            بخصوص: <span className="font-bold">{request.reason}</span>. يتم تحديد مدة الراحة
            المرضية بعد تسجيل الطبيب للقرار النهائي في نموذج الكشف.
          </p>
        </div>

        <SignatureBlock first="توقيع الطبيب" second="شؤون العاملين" />
      </PrintableShell>
    </div>
  );
}

function PrintableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border-2 border-slate-300 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
      {children}
    </div>
  );
}

function SignatureBlock({ first, second }: { first: string; second: string }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-8 border-t pt-4 text-center text-sm">
      <div>
        <div className="mt-12 border-t-2 border-slate-400 pt-2">{first}</div>
      </div>
      <div>
        <div className="mt-12 border-t-2 border-slate-400 pt-2">{second}</div>
      </div>
    </div>
  );
}

export function PrintPage() {
  const { requests } = useWorkflow();
  useStore(profilesStore, (s) => s.getAll()); // اشتراك تفاعلي لأسماء الأطباء
  const [selectedId, setSelectedId] = useState(requests[0]?.id || "");

  const selectedRequest = useMemo(() => {
    return requests.find((request) => request.id === selectedId) || requests[0];
  }, [requests, selectedId]);

  if (!selectedRequest) {
    return (
      <PageLayout
        title="المطبوعات والوثائق الرسمية"
        subtitle="لا توجد طلبات متاحة للطباعة"
        icon={<Printer className="h-5 w-5 text-white" />}
        backLink="/dashboard"
      >
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
          لا توجد طلبات مسجلة حالياً.
        </div>
      </PageLayout>
    );
  }

  const checkupRequests = requests.filter((request) => request.serviceType !== "monthly_treatment");
  const monthlyRequests = requests.filter((request) => request.serviceType === "monthly_treatment");

  return (
    <PageLayout
      title="المطبوعات والوثائق الرسمية"
      subtitle="طباعة المستندات من الطلبات الفعلية المسجلة"
      icon={<Printer className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <aside className="xl:col-span-4">
          <RequestSelector requests={requests} selectedId={selectedRequest.id} onSelect={setSelectedId} />
        </aside>

        <main className="xl:col-span-8">
          <Tabs defaultValue="summary" dir="rtl">
            <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1 print:hidden">
              <TabsTrigger value="summary" className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" />
                ملخص الطلب
              </TabsTrigger>
              <TabsTrigger value="prescription" className="gap-1.5 text-xs" disabled={!checkupRequests.includes(selectedRequest)}>
                <Pill className="h-3.5 w-3.5" />
                الوصفة
              </TabsTrigger>
              <TabsTrigger value="sickleave" className="gap-1.5 text-xs" disabled={!checkupRequests.includes(selectedRequest)}>
                <BedDouble className="h-3.5 w-3.5" />
                إجازة مرضية
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-1.5 text-xs" disabled={!monthlyRequests.includes(selectedRequest)}>
                <ClipboardList className="h-3.5 w-3.5" />
                علاج شهري
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <RequestSummaryPrint request={selectedRequest} />
            </TabsContent>
            <TabsContent value="prescription">
              <PrescriptionPrint request={selectedRequest} />
            </TabsContent>
            <TabsContent value="sickleave">
              <SickLeavePrint request={selectedRequest} />
            </TabsContent>
            <TabsContent value="monthly">
              <MonthlyTreatmentPrint request={selectedRequest} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </PageLayout>
  );
}
