import { useEffect, useState } from "react";
import {
  Check,
  ClipboardList,
  History,
  Printer,
  Search,
  Store,
  Upload,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { useAuth } from "@/app/features/auth/AuthContext";
import { apiClient } from "@/app/services/apiClient";
import { toast } from "sonner";

type MonthlyTreatment = {
  id: number;
  disease_name: string;
  status: string;
  dispensing_month?: string;
  dispensing_status?: string;
  employee_name?: string;
  financial_number?: string;
  employee?: { name?: string; financial_number?: string };
};

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`mb-1 text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-sm text-slate-600">{label}</div>
      </CardContent>
    </Card>
  );
}

function EmptyExternalData({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <Upload className="h-7 w-7 text-teal-700" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function MonthlyTreatmentTab({
  treatments,
  onDispense,
}: {
  treatments: MonthlyTreatment[];
  onDispense: (id: number) => void;
}) {
  if (treatments.length === 0) {
    return (
      <EmptyExternalData
        title="لا يوجد علاج شهري مستحق الآن"
        description="ستظهر هنا العلاجات الشهرية المستحقة للصرف من الصيدلية الخارجية."
      />
    );
  }

  return (
    <div className="space-y-3">
      {treatments.map((t) => {
        const name = t.employee_name ?? t.employee?.name ?? "غير محدد";
        const fin  = t.financial_number ?? t.employee?.financial_number ?? "—";
        const isPending = t.dispensing_status === "pending" || !t.dispensing_status;
        return (
          <Card key={t.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-1">
                <p className="font-bold text-slate-900">{name}</p>
                <p className="text-sm text-slate-500">الرقم المالي: {fin}</p>
                <p className="text-sm text-slate-600">{t.disease_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={isPending ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                  {isPending ? "في انتظار الصرف" : "تم الصرف"}
                </Badge>
                {isPending && (
                  <Button size="sm" onClick={() => onDispense(t.id)}>
                    <Check className="ml-1 h-4 w-4" />
                    تأكيد الصرف
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ExternalPharmacyPage() {
  const { isApiConnected } = useAuth();
  const [treatments, setTreatments] = useState<MonthlyTreatment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTreatments = () => {
    if (!isApiConnected) return;
    setIsLoading(true);
    apiClient.get("/external-pharmacy/monthly-treatments?per_page=100")
      .then((res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        setTreatments(items);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTreatments();
  }, [isApiConnected]);

  const handleDispense = async (id: number) => {
    try {
      await apiClient.post(`/external-pharmacy/treatments/${id}/dispense`);
      toast.success("تم تأكيد صرف العلاج الشهري");
      fetchTreatments();
    } catch (err) {
      toast.error("تعذر تأكيد الصرف", {
        description: err instanceof Error ? err.message : "حدث خطأ",
      });
    }
  };

  const pendingCount  = treatments.filter((t) => !t.dispensing_status || t.dispensing_status === "pending").length;
  const dispensedToday = treatments.filter((t) => t.dispensing_status === "dispensed").length;

  return (
    <PageLayout
      title="الصيدلية الخارجية"
      subtitle="العلاج الشهري للمعاشات والمستفيدين"
      icon={<Store className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="في انتظار الصرف"  value={String(pendingCount)}   color="text-yellow-700" />
        <StatCard label="تم الصرف اليوم"   value={String(dispensedToday)} color="text-green-700"  />
        <StatCard label="إجمالي الشهر"     value={String(treatments.length)} color="text-purple-700" />
        <StatCard label="الاتصال بالخادم" value={isApiConnected ? "متصل" : "غير متصل"} color={isApiConnected ? "text-green-700" : "text-red-600"} />
      </div>

      <Tabs defaultValue="monthly" dir="rtl">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="monthly" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            العلاج الشهري
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            البحث عن مستفيد
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            سجل الصرف
          </TabsTrigger>
          <TabsTrigger value="receipt" className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            إيصال التأكيد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">جاري التحميل...</div>
          ) : (
            <MonthlyTreatmentTab treatments={treatments} onDispense={handleDispense} />
          )}
        </TabsContent>

        <TabsContent value="search">
          <div className="mx-auto max-w-2xl space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">البحث عن مستفيد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input className="h-11 pr-10" placeholder="رقم المعاش أو الرقم القومي أو اسم المستفيد..." />
                  </div>
                  <Button className="px-6">بحث</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <EmptyExternalData
            title="سجل الصرف"
            description="سيظهر هنا سجل العلاجات الشهرية التي تم صرفها."
          />
        </TabsContent>

        <TabsContent value="receipt">
          <EmptyExternalData
            title="لا يوجد إيصال محدد"
            description="اختر عملية صرف لطباعة الإيصال."
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
