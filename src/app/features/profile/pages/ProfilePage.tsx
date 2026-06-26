import { useState } from "react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { PageLayout } from "@/app/components/PageLayout";
import { useAuth } from "@/app/features/auth/AuthContext";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStatusLabels } from "@/app/types/workflow";
import { apiClient } from "@/app/services/apiClient";
import { toast } from "sonner";
import { Activity, BadgeCheck, Building, ClipboardList, IdCard, Pencil, Phone, User, UserCog } from "lucide-react";

const roleLabels = {
  employee: "موظف",
  manager: "مدير إدارة",
  office_manager: "مدير مكتب",
  security: "الأمن",
  doctor: "طبيب",
  pharmacy: "صيدلية",
  medical_admin: "إدارة طبية",
  pension_admin: "إدارة معاشات",
  super_admin: "مدير النظام",
};

function valueOrDash(value?: string) {
  return value && value.trim() ? value : "غير مسجل";
}

export function ProfilePage() {
  const { user, isApiConnected } = useAuth();
  const { requests } = useWorkflow();

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "" });

  const userRequests = requests.filter(
    (request) => request.employeeId === user?.id || request.financialNumber === user?.financialNumber
  );

  const completedRequests = userRequests.filter((request) => request.status === "completed").length;
  const openRequests = userRequests.filter(
    (request) => !["completed", "rejected", "cancelled"].includes(request.status)
  );

  const profileFields = [
    { label: "الاسم", value: user?.name, icon: User },
    { label: "الرقم المالي", value: user?.financialNumber || user?.username, icon: BadgeCheck },
    { label: "الإدارة", value: user?.department || user?.workPlace, icon: Building },
    { label: "الوظيفة", value: user?.jobTitle, icon: UserCog },
    { label: "الرقم القومي", value: user?.nationalId, icon: IdCard },
    { label: "رقم التليفون", value: user?.phone, icon: Phone },
    { label: "طبيعة العمل", value: user?.workType, icon: Activity },
    { label: "الصلاحية", value: user ? roleLabels[user.role] : undefined, icon: ClipboardList },
  ];

  const openEdit = () => {
    setForm({ name: user?.name ?? "", phone: user?.phone ?? "" });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!isApiConnected) {
      toast.error("غير متصل بالخادم");
      return;
    }
    setSaving(true);
    try {
      await apiClient.put("/employee/profile", {
        name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      toast.success("تم تحديث بيانات الملف الشخصي");
      setEditOpen(false);
      // Reload the page to reflect changes (user in AuthContext persists from localStorage)
      window.location.reload();
    } catch (err) {
      toast.error("تعذر الحفظ", { description: err instanceof Error ? err.message : "حدث خطأ" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="الملف الشخصي" subtitle="بيانات العامل المسجلة في النظام" icon={<User className="h-5 w-5" />}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-500">المستخدم الحالي</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                  {valueOrDash(user?.name)}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {valueOrDash(user?.jobTitle)} - {valueOrDash(user?.department || user?.workPlace)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-teal-600 text-white hover:bg-teal-600">
                  {user ? roleLabels[user.role] : "غير مسجل"}
                </Badge>
                <Badge variant="outline">رقم مالي: {valueOrDash(user?.financialNumber || user?.username)}</Badge>
                {isApiConnected && (
                  <Button size="sm" variant="outline" onClick={openEdit}>
                    <Pencil className="ml-1.5 h-3.5 w-3.5" />
                    تعديل البيانات
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-sm text-slate-500">إجمالي طلباتي</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{userRequests.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-sm text-slate-500">طلبات مفتوحة</p>
              <p className="mt-2 text-3xl font-extrabold text-amber-600">{openRequests.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-sm text-slate-500">طلبات مكتملة</p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-600">{completedRequests}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>بيانات العامل بالكامل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {profileFields.map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.label} className="rounded-2xl border bg-white p-4">
                    <div className="mb-3 flex items-center gap-2 text-slate-500">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{field.label}</span>
                    </div>
                    <p className="break-words text-base font-bold text-slate-900">
                      {valueOrDash(field.value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>آخر الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {userRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-slate-500">
                لا توجد طلبات مسجلة لهذا المستخدم حتى الآن.
              </div>
            ) : (
              <div className="space-y-3">
                {userRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex flex-col gap-2 rounded-2xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{request.id}</p>
                      <p className="mt-1 text-sm text-slate-500">{request.reason}</p>
                    </div>
                    <Badge variant="outline">{requestStatusLabels[request.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل البيانات الشخصية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الاسم الكامل</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="الاسم الكامل"
              />
            </div>
            <div className="space-y-1.5">
              <Label>رقم التليفون</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01xxxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
