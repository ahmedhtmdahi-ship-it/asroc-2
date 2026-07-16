import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { PageLayout } from "@/app/components/PageLayout";
import { useAuth } from "@/app/features/auth/AuthContext";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { ApiError } from "@/app/lib/apiClient";
import { requestStatusLabels } from "@/app/types/workflow";
import {
  Activity,
  BadgeCheck,
  Building,
  ClipboardList,
  IdCard,
  LockKeyhole,
  Phone,
  User,
  UserCog,
} from "lucide-react";

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
  const { user, changePassword } = useAuth();
  const { requests } = useWorkflow();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("كلمة المرور الجديدة يجب أن تختلف عن الحالية");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("تم تغيير كلمة المرور بنجاح");
      resetPasswordForm();
      setShowPasswordForm(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "تعذر تغيير كلمة المرور، حاول مرة أخرى";
      setPasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

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

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-teal-600 text-white hover:bg-teal-600">
                  {user ? roleLabels[user.role] : "غير مسجل"}
                </Badge>
                <Badge variant="outline">رقم مالي: {valueOrDash(user?.financialNumber || user?.username)}</Badge>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4" />
              كلمة المرور
            </CardTitle>
            {!showPasswordForm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordForm(true)}
              >
                تغيير كلمة المرور
              </Button>
            )}
          </CardHeader>
          {showPasswordForm && (
            <CardContent>
              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                {passwordError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {passwordError}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      resetPasswordForm();
                      setShowPasswordForm(false);
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
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
    </PageLayout>
  );
}
