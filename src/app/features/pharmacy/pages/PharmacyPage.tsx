import { useNavigate } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PackageX,
  Pill,
} from "lucide-react";
import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStatusLabels } from "@/app/types/workflow";
import { MedicineInventoryManager } from "@/app/features/pharmacy/components/MedicineInventoryManager";
import { medicineStore } from "@/app/store/medicineStore";

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

  const prescriptionQueue = requests.filter(
    (request) =>
      request.status === "prescribed" ||
      request.status === "monthly_ready_pharmacy"
  );
  const medicines = medicineStore.getAll();
  const unavailable = medicines.filter(
    (medicine) => typeof medicine.currentStock === "number" && medicine.currentStock <= 0
  );
  const lowStock = medicines.filter(
    (medicine) =>
      typeof medicine.currentStock === "number" &&
      medicine.currentStock > 0 &&
      typeof medicine.minimumStock === "number" &&
      medicine.currentStock <= medicine.minimumStock
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
            value={unavailable.length.toString()}
            label="أدوية غير متوفرة"
            icon={PackageX}
            color="text-red-600"
            bg="bg-red-50"
          />

          <StatCard
            value={lowStock.length.toString()}
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
