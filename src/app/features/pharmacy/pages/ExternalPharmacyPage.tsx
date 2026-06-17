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
        <Button className="mt-5" variant="outline">
          <Upload className="ml-2 h-4 w-4" />
          رفع ملف الصيدلية الخارجية
        </Button>
      </CardContent>
    </Card>
  );
}

function SearchTab() {
  return (
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
          <p className="text-xs text-slate-500">
            البحث سيعمل بعد ربط ملف أصحاب المعاشات والمستفيدين.
          </p>
        </CardContent>
      </Card>

      <EmptyExternalData
        title="لا توجد قاعدة مستفيدين خارجية مربوطة"
        description="تم حذف أمثلة الصرف القديمة. ارفع ملف الصيدلية الخارجية أو ملف المعاشات حتى يظهر البحث بنتائج حقيقية."
      />
    </div>
  );
}

export function ExternalPharmacyPage() {
  return (
    <PageLayout
      title="الصيدلية الخارجية"
      subtitle="جاهزة للربط بملفات المعاشات والصرف الخارجي"
      icon={<Store className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="في انتظار الصرف" value="0" color="text-yellow-700" />
        <StatCard label="تم الصرف اليوم" value="0" color="text-green-700" />
        <StatCard label="توصيات معتمدة" value="0" color="text-blue-700" />
        <StatCard label="إجمالي الشهر" value="0" color="text-purple-700" />
      </div>

      <Tabs defaultValue="search" dir="rtl">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="search" className="gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            البحث عن مستفيد
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            العلاج الشهري
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1.5 text-xs">
            <Check className="h-3.5 w-3.5" />
            صرف التوصيات
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

        <TabsContent value="search">
          <SearchTab />
        </TabsContent>
        <TabsContent value="monthly">
          <EmptyExternalData
            title="قائمة العلاج الشهري الخارجية غير مربوطة"
            description="ارفع ملف العلاج الشهري للصيدليات الخارجية لعرض حالات الصرف المستحقة."
          />
        </TabsContent>
        <TabsContent value="recommendations">
          <EmptyExternalData
            title="لا توجد توصيات خارجية حقيقية"
            description="ارفع ملف التوصيات المعتمدة من المستشفيات أو التعاقدات الخارجية."
          />
        </TabsContent>
        <TabsContent value="history">
          <EmptyExternalData
            title="سجل الصرف الخارجي يحتاج مصدر بيانات"
            description="بعد رفع سجل الصرف ستظهر الإيصالات، الصيدلي، التاريخ، والقيمة هنا."
          />
        </TabsContent>
        <TabsContent value="receipt">
          <EmptyExternalData
            title="لا يوجد إيصال صرف محدد"
            description="اختر عملية صرف حقيقية بعد ربط سجل الصيدلية الخارجية لطباعة الإيصال."
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
