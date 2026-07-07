import { useEffect, useMemo, useState } from "react";
import {
  Building,
  ClipboardList,
  Download,
  Eye,
  Package,
  Plus,
  Search,
  Settings,
  Shield,
  Stethoscope,
  Store,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Label } from "@/app/components/ui/label";
import { MedicineInventoryManager } from "@/app/features/pharmacy/components/MedicineInventoryManager";
import { useAuth } from "@/app/features/auth/AuthContext";
import {
  listUsersApi,
  updateUserApi,
  createUserApi,
  listAuditLogsApi,
  countAuditLogsApi,
  type ApiUser,
} from "@/app/lib/dataApi";
import { USER_ROLES } from "@asroc/shared/roles.js";
import { ApiError } from "@/app/lib/apiClient";
import type { Permission, User, UserRole } from "@/app/types/user";

// ✅ إصلاح: حذف password تماماً
function apiUserToUser(u: ApiUser): User {
  return {
    id:              u.id,
    name:            u.name,
    username:        u.username,
    financialNumber: u.financialNumber ?? undefined,
    jobTitle:        u.jobTitle ?? undefined,
    workPlace:       u.workPlace ?? undefined,
    department:      u.department ?? undefined,
    nationalId:      u.nationalId ?? undefined,
    phone:           u.phone ?? undefined,
    workType:        u.workType ?? undefined,
    role:            u.role as UserRole,
    permissions:     u.permissions as Permission[],
    isActive:        u.isActive,
  };
}

// ─── Types ─────────────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  request_id?: string;
  status_before?: string;
  status_after?: string;
  created_at: string;
}

// ─── Role & Permission Labels ────────────────────────────────────────
const roleLabels: Record<UserRole, string> = {
  employee: "موظف",
  manager: "مدير/مكلف",
  office_manager: "مدير مكتب",
  security: "أمن",
  doctor: "طبيب",
  pharmacy: "صيدلية",
  medical_admin: "إدارة طبية",
  pension_admin: "إدارة معاشات",
  super_admin: "مشرف نظام",
};

const permissionLabels: Record<Permission, string> = {
  create_request: "إنشاء طلب",
  view_own_requests: "عرض طلباتي",
  view_medical_history: "عرض التاريخ الطبي",
  approve_request: "اعتماد الطلبات",
  reject_request: "رفض الطلبات",
  postpone_request: "تأجيل الطلبات",
  security_check_out: "تسجيل خروج الأمن",
  security_check_in: "تسجيل عودة الأمن",
  diagnose_patient: "تشخيص المريض",
  create_prescription: "كتابة روشتة",
  create_referral: "إنشاء تحويل",
  create_sick_leave: "إجازة مرضية",
  recommend_monthly_treatment: "توصية علاج شهري",
  dispense_prescription: "صرف روشتة",
  manage_inventory: "إدارة المخزون",
  approve_referral: "اعتماد تحويل",
  manage_monthly_treatment: "إدارة علاج شهري",
  manage_pensioners: "إدارة معاشات",
  manage_contracts: "إدارة تعاقدات",
  manage_pharmacy: "إدارة صيدلية",
  manage_system: "إدارة النظام",
  manage_referrals: "إدارة التحويلات",
  dispense_regular_treatment: "صرف علاج عادي",
  dispense_monthly_treatment: "صرف علاج شهري",
  view_reports: "عرض التقارير",
  print_documents: "طباعة مستندات",
  view_audit_log: "سجل العمليات",
  all: "كل الصلاحيات",
};

function roleLabel(role: UserRole) {
  return roleLabels[role] || role;
}

function permissionLabel(permission: Permission) {
  return permissionLabels[permission] || permission;
}

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

// ─── Reusable Components ─────────────────────────────────────────────
// ✅ إصلاح: إزالة text-left وتحديد نوع icon بدل any
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex h-48 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p>{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        إعادة المحاولة
      </Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
      {message}
    </div>
  );
}

function PermissionsEditor({
  user,
  onSave,
  onCancel,
}: {
  user: User;
  onSave: (userId: string, newPermissions: string[]) => void;
  onCancel: () => void;
}) {
  const allPermissions = Object.keys(permissionLabels) as Permission[];
  const [selected, setSelected] = useState<string[]>(user.permissions || []);

  useEffect(() => {
    setSelected(user.permissions || []);
  }, [user]);

  function toggle(p: string) {
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {allPermissions.map((perm) => (
          <label key={perm} className="flex items-center gap-2 rounded-md border p-2">
            <Checkbox checked={selected.includes(perm)} onCheckedChange={() => toggle(perm)} />
            <div>
              <div className="font-semibold">{permissionLabel(perm as Permission)}</div>
              <div className="text-xs text-slate-500">{perm}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button onClick={() => onSave(user.id, selected)}>حفظ</Button>
      </div>
    </div>
  );
}

// ─── Users Tab ─────────────────────────────────────────────────────────
function UsersTab() {
  const { user: currentUser } = useAuth(); // ✅ إضافة للتحقق من المستخدم الحالي
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
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
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsersApi();
      setUsers(data.map(apiUserToUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleChangeRole(userId: string, newRole: UserRole) {
    // ✅ حماية: منع تغيير دور المستخدم نفسه
    if (userId === currentUser?.id) {
      alert("لا يمكنك تغيير دورك الخاص");
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!confirm(`هل أنت متأكد من تغيير دور "${targetUser?.name}" إلى "${roleLabel(newRole)}"؟`)) {
      return;
    }

    setSavingRoleId(userId);
    try {
      const updated = await updateUserApi(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? apiUserToUser(updated) : u)));
    } catch {
      // keep old value on error
    } finally {
      setSavingRoleId(null);
    }
  }

  async function handleSavePermissions(userId: string, newPermissions: string[]) {
    // ✅ حماية: منع تغيير صلاحيات المستخدم نفسه
    if (userId === currentUser?.id) {
      alert("لا يمكنك تعديل صلاحياتك الخاصة");
      setPermissionsOpen(false);
      setEditingUser(null);
      return;
    }

    try {
      const updated = await updateUserApi(userId, { permissions: newPermissions });
      setUsers((prev) => prev.map((u) => (u.id === userId ? apiUserToUser(updated) : u)));
    } finally {
      setPermissionsOpen(false);
      setEditingUser(null);
    }
  }

  function resetNewUserForm() {
    setNewUser({
      username: "",
      password: "",
      name: "",
      role: "employee",
      financialNumber: "",
      jobTitle: "",
      workPlace: "",
      department: "",
      nationalId: "",
      phone: "",
      workType: "",
    });
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
      setUsers((prev) => [apiUserToUser(created), ...prev]);
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchUsers} />;

  return (
    <div className="space-y-4">
      {/* ✅ إصلاح: استخدام import.meta.env.DEV بدل المتغير اليدوي */}
      {import.meta.env.DEV && (
        <div className="rounded-md bg-yellow-50 p-2 text-xs text-amber-800">
          Debug: users={users.length} loading={String(loading)} error={String(error)}
        </div>
      )}
      
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
                        // ✅ حماية: تعطيل القائمة إذا كان المستخدم الحالي
                        disabled={savingRoleId === user.id || user.id === currentUser?.id}
                        onChange={(e) => handleChangeRole(user.id, e.target.value as UserRole)}
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 disabled:opacity-50"
                      >
                        <option value="employee">موظف</option>
                        <option value="manager">مدير</option>
                        <option value="office_manager">مدير مكتب</option>
                        <option value="security">أمن</option>
                        <option value="doctor">طبيب</option>
                        <option value="pharmacy">صيدلي</option>
                        <option value="medical_admin">إداري طبي</option>
                        <option value="pension_admin">إداري معاشات</option>
                        <option value="super_admin">سوبر أدمن</option>
                      </select>
                    </td>
                    <td className="p-3 text-slate-600">{user.department || "غير محدد"}</td>
                    <td className="p-3 text-slate-600">{user.jobTitle || "غير محدد"}</td>
                    <td className="p-3 text-slate-600">{user.workType || "غير محدد"}</td>
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
                          // ✅ حماية: منع فتح إعدادات الصلاحيات للمستخدم نفسه
                          disabled={user.id === currentUser?.id}
                          onClick={() => {
                            setEditingUser(user);
                            setPermissionsOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
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

// ─── Roles Tab ─────────────────────────────────────────────────────────
function RolesTab({ users }: { users: User[] }) {
  const roleStats = useMemo(() => {
    return Object.entries(
      users.reduce<Record<string, number>>((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {})
    );
  }, [users]);

  if (users.length === 0) return <EmptyState message="لا توجد بيانات مستخدمين" />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {roleStats.map(([role, count]) => {
        const usersInRole = users.filter((user) => user.role === role);
        const permissions = new Set(usersInRole.flatMap((user) => user.permissions));

        return (
          <Card key={role}>
            <CardContent className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{roleLabel(role as UserRole)}</h3>
                  <p className="mt-1 text-xs text-slate-500">{role}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700">{count} مستخدم</Badge>
              </div>
              <p className="text-sm text-slate-600">
                {permissions.size} صلاحية مفعلة ضمن هذا الدور.
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Permissions Tab ───────────────────────────────────────────────────
function PermissionsTab({ users }: { users: User[] }) {
  const permissionStats = useMemo(() => {
    return Object.entries(
      users.reduce<Record<string, number>>((acc, user) => {
        user.permissions.forEach((permission: string) => {
          acc[permission] = (acc[permission] || 0) + 1;
        });
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);
  }, [users]);

  if (users.length === 0) return <EmptyState message="لا توجد بيانات مستخدمين" />;

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-right">الصلاحية</th>
              <th className="p-3 text-right">الكود</th>
              <th className="p-3 text-right">عدد المستخدمين</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {permissionStats.map(([permission, count]) => (
              <tr key={permission}>
                <td className="p-3 font-semibold">
                  {permissionLabel(permission as Permission)}
                </td>
                <td className="p-3 font-mono text-xs text-slate-500">{permission}</td>
                <td className="p-3">
                  <Badge variant="outline">{count}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Departments Tab ───────────────────────────────────────────────────
function DepartmentsTab({ users }: { users: User[] }) {
  const departments = useMemo(() => {
    const map = new Map<string, { name: string; count: number; managers: User[] }>();

    users.forEach((user) => {
      const name = user.department || "غير محدد";
      const current = map.get(name) || { name, count: 0, managers: [] as User[] };
      current.count += 1;
      if (user.role === "manager" || user.role === "office_manager") current.managers.push(user);
      map.set(name, current);
    });

    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [users]);

  if (users.length === 0) return <EmptyState message="لا توجد بيانات مستخدمين" />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {departments.map((department) => (
        <Card key={department.name}>
          <CardContent className="p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-bold text-slate-900">{department.name}</h3>
              <Badge className="bg-teal-100 text-teal-700">{department.count} فرد</Badge>
            </div>
            <p className="text-sm text-slate-600">
              المسؤول:{" "}
              <span className="font-semibold">
                {department.managers[0]?.name || "غير محدد"}
              </span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Role Users Tab (Doctors / Pharmacies) ────────────────────────────
function RoleUsersTab({ role, users }: { role: UserRole; users: User[] }) {
  const roleUsers = useMemo(() => users.filter((user) => user.role === role), [users, role]);

  if (users.length === 0) return <EmptyState message="لا توجد بيانات مستخدمين" />;
  if (roleUsers.length === 0) return <EmptyState message={`لا يوجد ${roleLabel(role)} مسجلون`} />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {roleUsers.map((user) => (
        <Card key={user.id}>
          <CardContent className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{user.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{user.financialNumber}</p>
              </div>
              <Badge variant="outline">{roleLabel(user.role)}</Badge>
            </div>
            <p className="text-sm text-slate-600">{user.jobTitle || "غير محدد"}</p>
            <p className="mt-1 text-sm text-slate-500">{user.department || "غير محدد"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Medicines Tab ───────────────────────────────────────────────────
function MedicinesTab() {
  return <MedicineInventoryManager />;
}

// ─── Audit Logs Tab ────────────────────────────────────────────────────
function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAuditLogsApi(500);
      setLogs(data.map((l) => ({
        id:           l.id,
        user_id:      l.user_id ?? "",
        user_name:    l.user_name ?? "",
        action:       l.action,
        request_id:   l.request_id ?? undefined,
        status_before: l.status_before ?? undefined,
        status_after:  l.status_after ?? undefined,
        created_at:   l.created_at,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل السجل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchLogs} />;

  if (logs.length === 0) {
    return <EmptyState message="لا توجد عمليات مسجلة حتى الآن." />;
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-right">المستخدم</th>
              <th className="p-3 text-right">الإجراء</th>
              <th className="p-3 text-right">الطلب</th>
              <th className="p-3 text-right">من</th>
              <th className="p-3 text-right">إلى</th>
              <th className="p-3 text-right">التوقيت</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="p-3 font-semibold">{log.user_name || "غير محدد"}</td>
                <td className="p-3">{log.action || "تحديث"}</td>
                <td className="p-3">{log.request_id || "-"}</td>
                <td className="p-3">{log.status_before || "-"}</td>
                <td className="p-3">{log.status_after || "-"}</td>
                <td className="p-3 text-xs text-slate-500">
                  {log.created_at ? new Date(log.created_at).toLocaleString("ar-EG") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────
export function SuperAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogsCount, setAuditLogsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersData, countData] = await Promise.all([
        listUsersApi(),
        countAuditLogsApi(),
      ]);
      setUsers(usersData.map(apiUserToUser));
      setAuditLogsCount(countData.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalDepartments = useMemo(
    () => new Set(users.map((user) => user.department || "غير محدد")).size,
    [users]
  );

  if (loading) {
    return (
      <PageLayout
        title="الإدارة العليا للنظام"
        subtitle="إدارة المستخدمين والصلاحيات"
        icon={<Settings className="h-5 w-5 text-white" />}
        backLink="/dashboard"
      >
        <LoadingState />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        title="الإدارة العليا للنظام"
        subtitle="إدارة المستخدمين والصلاحيات"
        icon={<Settings className="h-5 w-5 text-white" />}
        backLink="/dashboard"
      >
        <ErrorState message={error} onRetry={fetchData} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="الإدارة العليا للنظام"
      subtitle="إدارة المستخدمين والصلاحيات طبقاً لشيتات الشركة"
      icon={<Settings className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="إجمالي المستخدمين"
          value={users.length}
          icon={Users}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard
          label="الأدوار الفعلية"
          value={new Set(users.map((user) => user.role)).size}
          icon={Shield}
          color="text-purple-700"
          bg="bg-purple-50"
        />
        <StatCard
          label="الإدارات"
          value={totalDepartments}
          icon={Building}
          color="text-teal-700"
          bg="bg-teal-50"
        />
        <StatCard
          label="سجلات العمليات"
          value={auditLogsCount}
          icon={ClipboardList}
          color="text-orange-700"
          bg="bg-orange-50"
        />
      </div>

      <Tabs defaultValue="users" dir="rtl">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            المستخدمون
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" />
            الأدوار
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            الصلاحيات
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5 text-xs">
            <Building className="h-3.5 w-3.5" />
            الإدارات
          </TabsTrigger>
          <TabsTrigger value="doctors" className="gap-1.5 text-xs">
            <Stethoscope className="h-3.5 w-3.5" />
            الأطباء
          </TabsTrigger>
          <TabsTrigger value="pharmacies" className="gap-1.5 text-xs">
            <Store className="h-3.5 w-3.5" />
            الصيدلية
          </TabsTrigger>
          <TabsTrigger value="medicines" className="gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" />
            الأدوية
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            السجل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab users={users} />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionsTab users={users} />
        </TabsContent>
        <TabsContent value="departments">
          <DepartmentsTab users={users} />
        </TabsContent>
        <TabsContent value="doctors">
          <RoleUsersTab role="doctor" users={users} />
        </TabsContent>
        <TabsContent value="pharmacies">
          <RoleUsersTab role="pharmacy" users={users} />
        </TabsContent>
        <TabsContent value="medicines">
          <MedicinesTab />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}