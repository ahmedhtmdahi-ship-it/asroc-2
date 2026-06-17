import {
  ArrowUpRight,
  Calendar,
  FileText,
  Heart,
  Landmark,
  Plus,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
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

function EmptyDataPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
          <Upload className="h-7 w-7 text-blue-700" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">{description}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="outline">
            <Upload className="ml-2 h-4 w-4" />
            رفع ملف البيانات
          </Button>
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            إضافة سجل يدوي
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PensionAdminPage() {
  return (
    <PageLayout
      title="إدارة المعاشات"
      subtitle="جاهزة للربط بملف أصحاب المعاشات والمستفيدين"
      icon={<Landmark className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="أصحاب المعاشات" value="0" color="text-blue-700" />
        <StatCard label="المستفيدون" value="0" color="text-green-700" />
        <StatCard label="علاج شهري معاشات" value="0" color="text-orange-700" />
        <StatCard label="تحويلات خارجية" value="0" color="text-purple-700" />
      </div>

      <Tabs defaultValue="pensioners" dir="rtl">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="pensioners" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            أصحاب المعاشات
          </TabsTrigger>
          <TabsTrigger value="beneficiaries" className="gap-1.5 text-xs">
            <Heart className="h-3.5 w-3.5" />
            المستفيدون
          </TabsTrigger>
          <TabsTrigger value="family" className="gap-1.5 text-xs">
            <UserCheck className="h-3.5 w-3.5" />
            إدارة الأسرة
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            العلاج الشهري
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-1.5 text-xs">
            <ArrowUpRight className="h-3.5 w-3.5" />
            تحويلات خارجية
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            توصيات خارجية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pensioners">
          <EmptyDataPanel
            title="لا يوجد ملف معاشات مربوط حالياً"
            description="تم حذف البيانات التجريبية القديمة. ارفع شيت أصحاب المعاشات وفيه رقم المعاش، الاسم، الرقم القومي، الهاتف، الحالة، وبيانات المستفيدين ليتم ربط هذه الشاشة ببيانات حقيقية."
          />
        </TabsContent>
        <TabsContent value="beneficiaries">
          <EmptyDataPanel
            title="المستفيدون يحتاجون ملف بيانات"
            description="ارفع ملف المستفيدين أو أضفهم داخل شيت المعاشات بعلاقة واضحة مع صاحب المعاش حتى تظهر هنا بدون بيانات مخترعة."
          />
        </TabsContent>
        <TabsContent value="family">
          <EmptyDataPanel
            title="إدارة الأسرة جاهزة للربط"
            description="هذه الشاشة ستعرض أفراد الأسرة ونطاق استحقاق العلاج بعد توفر ملف المستفيدين."
          />
        </TabsContent>
        <TabsContent value="monthly">
          <EmptyDataPanel
            title="علاج معاشات شهري غير مربوط بعد"
            description="ارفع ملف العلاجات الشهرية لأصحاب المعاشات أو ملف صرف الصيدلية الخارجية لعرض الحالات المستحقة والمصروفة."
          />
        </TabsContent>
        <TabsContent value="referrals">
          <EmptyDataPanel
            title="لا توجد تحويلات معاشات حقيقية"
            description="عند توفر ملف التحويلات الخارجية سيتم عرض جهة التحويل والتخصص والحالة وسجل الموافقات هنا."
          />
        </TabsContent>
        <TabsContent value="recommendations">
          <EmptyDataPanel
            title="لا توجد توصيات خارجية مربوطة"
            description="ارفع ملف توصيات المستشفيات أو التعاقدات الخارجية حتى يتم عرضها ومراجعتها."
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
