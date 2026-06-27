import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Loader2,
  PackageX,
  Pill,
  Upload,
} from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { useAuth } from "@/app/features/auth/AuthContext";
import { checkupService } from "@/app/services/checkupService";
import { requestStatusLabels } from "@/app/types/workflow";
import { MedicineInventoryManager } from "@/app/features/pharmacy/components/MedicineInventoryManager";
import { medicineStore } from "@/app/store/medicineStore";
import { apiClient } from "@/app/services/apiClient";
import { toast } from "sonner";

function StatCard({
  value,
  label,
  icon: Icon,
  color,
  bg,
}: {
  value: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div
            className={`w-14 h-14 rounded-full ${bg} flex items-center justify-center`}
          >
            <Icon className={`w-7 h-7 ${color}`} />
          </div>

          <div className="text-left">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PharmacyPage() {
  const navigate = useNavigate();
  const { requests } = useWorkflow();
  const { isApiConnected } = useAuth();
  const [unavailableCount, setUnavailableCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isApiConnected) { toast.error("يجب الاتصال بالخادم للاستيراد"); return; }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiClient.upload("/medicines/import", formData);
      toast.success("تم استيراد الأدوية بنجاح", { description: "تم تحديث بيانات المخزون." });
    } catch {
      toast.error("فشل الاستيراد", { description: "تأكد أن الملف بصيغة Excel صحيحة." });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (isApiConnected) {
      checkupService.getMedicines({ per_page: 500 })
        .then((res: any) => {
          const items: any[] = Array.isArray(res) ? res : (res?.data ?? []);
          setUnavailableCount(items.filter((m) => (m.current_stock ?? 0) <= 0).length);
          setLowStockCount(items.filter((m) =>
            m.current_stock > 0 && m.minimum_stock != null && m.current_stock <= m.minimum_stock
          ).length);
        })
        .catch(() => {
          const meds = medicineStore.getAll();
          setUnavailableCount(meds.filter((m) => typeof m.currentStock === "number" && m.currentStock <= 0).length);
          setLowStockCount(meds.filter((m) =>
            typeof m.currentStock === "number" && m.currentStock > 0 &&
            typeof m.minimumStock === "number" && m.currentStock <= m.minimumStock
          ).length);
        });
    } else {
      const meds = medicineStore.getAll();
      setUnavailableCount(meds.filter((m) => typeof m.currentStock === "number" && m.currentStock <= 0).length);
      setLowStockCount(meds.filter((m) =>
        typeof m.currentStock === "number" && m.currentStock > 0 &&
        typeof m.minimumStock === "number" && m.currentStock <= m.minimumStock
      ).length);
    }
  }, [isApiConnected]);

  const prescriptionQueue = requests.filter(
    (request) =>
      request.status === "prescribed" ||
      request.status === "monthly_ready_pharmacy"
  );

  return (
    <PageLayout
      title="لوحة معلومات الصيدلية"
      subtitle="نظرة عامة على العمليات والمخزون"
      icon={<Pill className="w-5 h-5" />}
      backLink="/dashboard"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            value={unavailableCount.toString()}
            label="أدوية غير متوفرة"
            icon={PackageX}
            color="text-red-600"
            bg="bg-red-50"
          />

          <StatCard
            value={lowStockCount.toString()}
            label="أصناف مخزون منخفض"
            icon={AlertTriangle}
            color="text-orange-600"
            bg="bg-orange-50"
          />

          <StatCard
            value={requests.filter((request) => request.status === "dispensed" || request.status === "monthly_dispensed").length.toString()}
            label="وصفة مصروفة اليوم"
            icon={CheckCircle2}
            color="text-teal-600"
            bg="bg-teal-50"
          />

          <StatCard
            value={prescriptionQueue.length.toString()}
            label="طلبات صرف معلقة"
            icon={ClipboardList}
            color="text-teal-600"
            bg="bg-teal-50"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="w-5 h-5 text-green-700" />
              استيراد أدوية من Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <p className="text-sm text-slate-500 flex-1">
                قم بتحميل ملف Excel يحتوي على أعمدة: <strong>name, active_ingredient, category, current_stock, minimum_stock, unit</strong>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleExcelImport}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || !isApiConnected}
                className="bg-green-600 hover:bg-green-700 shrink-0"
              >
                {importing
                  ? <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  : <Upload className="w-4 h-4 ml-2" />}
                {importing ? "جاري الاستيراد..." : "اختر ملف واستورد"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-700" />
                قائمة الصرف المعلقة
              </CardTitle>
            </CardHeader>

            <CardContent>
              {prescriptionQueue.length === 0 && (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                  لا توجد وصفات أو علاجات شهرية جاهزة للصرف حالياً
                </div>
              )}

              {prescriptionQueue.length > 0 && (
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 text-right">رقم الطلب</th>
                        <th className="p-3 text-right">اسم المريض</th>
                        <th className="p-3 text-right">تاريخ الطلب</th>
                        <th className="p-3 text-right">نوع الطلب</th>
                        <th className="p-3 text-right">الحالة</th>
                        <th className="p-3 text-right">الإجراءات</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y bg-white">
                      {prescriptionQueue.map((request) => (
                        <tr key={request.id}>
                          <td className="p-3 font-semibold text-blue-800">
                            {request.id}
                          </td>

                          <td className="p-3">
                            {request.employeeName}
                          </td>

                          <td className="p-3">
                            {new Date(request.createdAt).toLocaleString("ar-EG")}
                          </td>

                          <td className="p-3">
                            <Badge
                              className={
                                request.status === "monthly_ready_pharmacy"
                                  ? "bg-teal-100 text-teal-700"
                                  : request.requestType === "emergency"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }
                            >
                              {request.status === "monthly_ready_pharmacy"
                                ? "علاج شهري"
                                : request.requestType === "emergency"
                                ? "كشف طوارئ"
                                : "كشف عادي"}
                            </Badge>
                          </td>

                          <td className="p-3">
                            <Badge className="bg-purple-100 text-purple-700">
                              {requestStatusLabels[request.status]}
                            </Badge>
                          </td>

                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(`/pharmacy/dispense/${request.id}`)
                              }
                            >
                              صرف
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="xl:col-span-1">
            <MedicineInventoryManager compact />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
