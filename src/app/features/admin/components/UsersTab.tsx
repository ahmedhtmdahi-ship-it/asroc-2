import { useMemo, useState } from "react";
import { Download, Eye, Plus, Search, Settings } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useAuth } from "@/app/features/auth/AuthContext";
import { ApiError } from "@/app/lib/apiClient";
import { createUserApi, setUserActiveApi, updateUserApi } from "@/app/lib/dataApi";
import type { User, UserRole } from "@/app/types/user";
import { USER_ROLES } from "@asroc/shared/roles.js";

import { apiUserToUser, permissionLabel, roleLabel } from "../lib/adminMappers";
import { EmptyState, PermissionsEditor } from "./adminShared";

function matchesUser(user: User, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [
    user.name,
    user.financialNumber,
    user.jobTitle,
    user.department,
    roleLabel(user.role),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
}

const emptyNewUser = {
  username: "",
  password: "",
  name: "",
  role: "employee" as UserRole,
  financialNumber: "",
  jobTitle: "",
  workPlace: "",
  department: "",
  nationalId: "",
  phone: "",
  workType: "",
};

interface ConfirmState {
  title: string;
  description: string;
  action: () => void;
}

/**
 * تاب المستخدمين — البيانات بتيجي من الصفحة الأم (fetch واحد للصفحة كلها)
 * وأي تعديل بيرجع لها عبر onUserUpdated/onUserCreated فيظهر في باقي التابات.
 */
export function UsersTab({
  users,
  onUserUpdated,
  onUserCreated,
}: {
  users: User[];
  onUserUpdated: (user: User) => void;
  onUserCreated: (user: User) => void;
}) {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState("");

  async function applyChangeRole(userId: string, newRole: UserRole) {
    setSavingRoleId(userId);
    try {
      const updated = await updateUserApi(userId, { role: newRole });
      onUserUpdated(apiUserToUser(updated));
    } catch (err) {
      toast.error(
        "فشل تغيير الدور: " + (err instanceof Error ? err.message : "خطأ غير معروف"),
      );
    } finally {
      setSavingRoleId(null);
    }
  }

  function handleChangeRole(userId: string, newRole: UserRole) {
    if (userId === currentUser?.id) {
      toast.error("لا يمكنك تغيير دورك الخاص");
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    setConfirmState({
      title: "تغيير دور المستخدم",
      description: `هل أنت متأكد من تغيير دور "${targetUser?.name}" إلى "${roleLabel(newRole)}"؟`,
      action: () => applyChangeRole(userId, newRole),
    });
  }

  async function applyToggleActive(user: User) {
    try {
      const updated = await setUserActiveApi(user.id, !user.isActive);
      onUserUpdated(apiUserToUser(updated));
    } catch {
      toast.error("حدث خطأ أثناء تحديث حالة المستخدم");
    }
  }

  function handleToggleActive(user: User) {
    if (user.id === currentUser?.id) {
      toast.error("لا يمكنك تعطيل حسابك");
      return;
    }

    setConfirmState({
      title: user.isActive ? "تعطيل المستخدم" : "تفعيل المستخدم",
      description: user.isActive
        ? `هل تريد تعطيل المستخدم "${user.name}"؟`
        : `هل تريد تفعيل المستخدم "${user.name}"؟`,
      action: () => applyToggleActive(user),
    });
  }

  async function handleSavePermissions(userId: string, newPermissions: string[]) {
    if (userId === currentUser?.id) {
      toast.error("لا يمكنك تعديل صلاحياتك الخاصة");
      setPermissionsOpen(false);
      setEditingUser(null);
      return;
    }

    try {
      const updated = await updateUserApi(userId, { permissions: newPermissions });
      onUserUpdated(apiUserToUser(updated));
    } catch (err) {
      toast.error(
        "فشل حفظ الصلاحيات: " + (err instanceof Error ? err.message : "خطأ غير معروف"),
      );
    } finally {
      setPermissionsOpen(false);
      setEditingUser(null);
    }
  }

  function resetNewUserForm() {
    setNewUser(emptyNewUser);
    setCreateUserError("");
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateUserError("");

    if (!newUser.username.trim() || !newUser.password.trim() || !newUser.name.trim()) {
      setCreateUserError("اسم المستخدم وكلمة المرور والاسم كلها مطلوبة");
      return;
    }

    setIsCreatingUser(true);
    try {
      const created = await createUserApi({
        username: newUser.username.trim(),
        password: newUser.password,
        name: newUser.name.trim(),
        role: newUser.role,
        financialNumber: newUser.financialNumber.trim() || undefined,
        jobTitle: newUser.jobTitle.trim() || undefined,
        workPlace: newUser.workPlace.trim() || undefined,
        department: newUser.department.trim() || undefined,
        nationalId: newUser.nationalId.trim() || undefined,
        phone: newUser.phone.trim() || undefined,
        workType: newUser.workType.trim() || undefined,
      });
      onUserCreated(apiUserToUser(created));
      resetNewUserForm();
      setShowAddUser(false);
    } catch (err) {
      setCreateUserError(
        err instanceof ApiError ? err.message : "تعذر إضافة المستخدم، حاول مرة أخرى",
      );
    } finally {
      setIsCreatingUser(false);
    }
  }

  function handleExportUsers() {
    const headers = ["الرقم المالي", "الاسم", "الدور", "الإدارة", "الوظيفة", "طبيعة العمل"];
    const rows = filteredUsers.map((u) => [
      u.financialNumber || "",
      u.name || "",
      roleLabel(u.role),
      u.department || "",
      u.jobTitle || "",
      u.workType || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // BOM عشان Excel يقرأ العربي صح
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => matchesUser(user, search)).slice(0, 250);
  }, [users, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
            className="h-11 pr-10"
            placeholder="بحث بالاسم أو الرقم المالي أو الإدارة أو الدور..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportUsers} disabled={filteredUsers.length === 0}>
            <Download className="ml-2 h-4 w-4" />
            تصدير
          </Button>
          <Button onClick={() => { resetNewUserForm(); setShowAddUser(true); }}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة مستخدم
          </Button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState message={search ? "لا توجد نتائج مطابقة للبحث" : "لا يوجد مستخدمين مسجلين"} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 text-right">الرقم المالي</th>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">الدور</th>
                  <th className="p-3 text-right">الإدارة</th>
                  <th className="p-3 text-right">الوظيفة</th>
                  <th className="p-3 text-right">طبيعة العمل</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{user.financialNumber}</td>
                    <td className="p-3 font-semibold text-slate-900">{user.name}</td>
                    <td className="p-3">
                      <select
                        value={user.role}
                        disabled={savingRoleId === user.id || user.id === currentUser?.id}
                        onChange={(e) => handleChangeRole(user.id, e.target.value as UserRole)}
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 disabled:opacity-50"
                      >
                        {USER_ROLES.map((r) => (
                          <option key={r} value={r}>{roleLabel(r)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-slate-600">{user.department || "غير محدد"}</td>
                    <td className="p-3 text-slate-600">{user.jobTitle || "غير محدد"}</td>
                    <td className="p-3 text-slate-600">{user.workType || "غير محدد"}</td>
                    <td className="p-3">
                      <Badge
                        className={
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {user.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setViewingUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={user.id === currentUser?.id}
                          onClick={() => {
                            setEditingUser(user);
                            setPermissionsOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant={user.isActive ? "destructive" : "outline"}
                          disabled={user.id === currentUser?.id}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? "تعطيل" : "تفعيل"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-center text-xs text-slate-500">
        يتم عرض أول 250 نتيجة فقط للحفاظ على سرعة الصفحة. إجمالي المستخدمين: {users.length}
      </p>

      {/* تأكيد الإجراءات الحساسة (بدل window.confirm) */}
      <AlertDialog
        open={!!confirmState}
        onOpenChange={(open: boolean) => { if (!open) setConfirmState(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmState?.action();
                setConfirmState(null);
              }}
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={permissionsOpen} onOpenChange={(open: boolean) => { if (!open) setEditingUser(null); setPermissionsOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل صلاحيات المستخدم</DialogTitle>
            <DialogDescription>اضغط على الصلاحيات لتفعيل/تعطيلها ثم احفظ التغييرات.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto py-4">
            {editingUser ? (
              <PermissionsEditor user={editingUser} onSave={handleSavePermissions} onCancel={() => { setPermissionsOpen(false); setEditingUser(null); }} />
            ) : (
              <div className="text-sm text-slate-500">لا يوجد مستخدم محدد</div>
            )}
          </div>

          <DialogFooter />
        </DialogContent>
      </Dialog>

      {/* عرض تفاصيل المستخدم */}
      <Dialog open={!!viewingUser} onOpenChange={(open: boolean) => { if (!open) setViewingUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>بيانات المستخدم</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
              {[
                ["الاسم", viewingUser.name],
                ["الرقم المالي", viewingUser.financialNumber],
                ["اسم المستخدم", viewingUser.username],
                ["الدور", roleLabel(viewingUser.role)],
                ["الإدارة", viewingUser.department],
                ["الوظيفة", viewingUser.jobTitle],
                ["مكان العمل", viewingUser.workPlace],
                ["طبيعة العمل", viewingUser.workType],
                ["الرقم القومي", viewingUser.nationalId],
                ["الهاتف", viewingUser.phone],
                ["الحالة", viewingUser.isActive ? "نشط" : "معطّل"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-2 text-sm">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="font-semibold text-slate-900">{value || "غير محدد"}</div>
                </div>
              ))}
              <div className="col-span-full rounded-lg border p-2 text-sm">
                <div className="mb-1 text-xs text-slate-500">الصلاحيات</div>
                <div className="flex flex-wrap gap-1">
                  {viewingUser.permissions.length === 0 ? (
                    <span className="text-slate-400">لا توجد صلاحيات</span>
                  ) : (
                    viewingUser.permissions.map((p) => (
                      <Badge key={p} variant="outline">{permissionLabel(p)}</Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingUser(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إضافة مستخدم جديد */}
      <Dialog
        open={showAddUser}
        onOpenChange={(open: boolean) => { if (!open) { resetNewUserForm(); } setShowAddUser(open); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            <DialogDescription>أدخل بيانات المستخدم — اسم المستخدم وكلمة المرور والاسم مطلوبين.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="grid max-h-[65vh] grid-cols-1 gap-3 overflow-auto py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nu-username">اسم المستخدم *</Label>
              <Input
                id="nu-username"
                value={newUser.username}
                onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-password">كلمة المرور *</Label>
              <Input
                id="nu-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nu-name">الاسم *</Label>
              <Input
                id="nu-name"
                value={newUser.name}
                onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-role">الدور *</Label>
              <select
                id="nu-role"
                value={newUser.role}
                onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as UserRole }))}
                className="h-10 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-800"
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>{roleLabel(r)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-fin">الرقم المالي</Label>
              <Input
                id="nu-fin"
                value={newUser.financialNumber}
                onChange={(e) => setNewUser((p) => ({ ...p, financialNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-job">الوظيفة</Label>
              <Input
                id="nu-job"
                value={newUser.jobTitle}
                onChange={(e) => setNewUser((p) => ({ ...p, jobTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-dept">الإدارة</Label>
              <Input
                id="nu-dept"
                value={newUser.department}
                onChange={(e) => setNewUser((p) => ({ ...p, department: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-workplace">مكان العمل</Label>
              <Input
                id="nu-workplace"
                value={newUser.workPlace}
                onChange={(e) => setNewUser((p) => ({ ...p, workPlace: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-worktype">طبيعة العمل</Label>
              <Input
                id="nu-worktype"
                value={newUser.workType}
                onChange={(e) => setNewUser((p) => ({ ...p, workType: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-national">الرقم القومي</Label>
              <Input
                id="nu-national"
                value={newUser.nationalId}
                onChange={(e) => setNewUser((p) => ({ ...p, nationalId: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-phone">الهاتف</Label>
              <Input
                id="nu-phone"
                value={newUser.phone}
                onChange={(e) => setNewUser((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>

            {createUserError && (
              <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {createUserError}
              </p>
            )}

            <DialogFooter className="col-span-full">
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isCreatingUser}>
                {isCreatingUser ? "جارٍ الإضافة..." : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
