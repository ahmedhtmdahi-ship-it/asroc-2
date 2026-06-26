import { useEffect, useMemo, useState } from "react";
import {
  Building,
  ClipboardList,
  Download,
  Package,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Settings,
  Shield,
  Stethoscope,
  Store,
  Trash2,
  UserCheck,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { MedicineInventoryManager } from "@/app/features/pharmacy/components/MedicineInventoryManager";
import { apiClient } from "@/app/services/apiClient";
import type { Permission, User, UserRole } from "@/app/types/user";

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

interface Department {
  id: string;
  name: string;
  manager_id?: string;
  manager_name?: string;
  employee_count: number;
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
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="text-left">
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

// ─── Backend role options for the form ────────────────────────────────
const backendRoles: { value: string; label: string }[] = [
  { value: "employee",           label: "موظف" },
  { value: "retired_employee",   label: "صاحب معاش" },
  { value: "manager",            label: "مدير إدارة" },
  { value: "office_manager",     label: "مدير مكتب" },
  { value: "security",           label: "أمن" },
  { value: "doctor",             label: "طبيب" },
  { value: "internal_pharmacy",  label: "صيدلية داخلية" },
  { value: "external_pharmacy",  label: "صيدلية خارجية" },
  { value: "medical_admin",      label: "إدارة طبية" },
  { value: "system_admin",       label: "مدير النظام" },
  { value: "top_management",     label: "إدارة عليا" },
];

type UserForm = { name: string; email: string; password: string; role: string };
const emptyForm: UserForm = { name: "", email: "", password: "", role: "employee" };

// ─── Users Tab ─────────────────────────────────────────────────────────
function UsersTab() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // dialog state
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/admin/users?per_page=500");
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      const mapped: User[] = items.map((u: any) => ({
        id:              String(u.id),
        username:        u.email ?? "",
        password:        "",
        name:            u.name ?? "",
        financialNumber: u.financial_number ?? "",
        jobTitle:        u.job_title ?? "",
        department:      u.department ?? "",
        workType:        u.work_type ?? "",
        role:            (Array.isArray(u.roles) ? u.roles[0] : u.role) ?? "employee",
        permissions:     [],
        isActive:        u.is_active !== false,
      }));
      setUsers(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogMode("create");
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.username, password: "", role: user.role });
    setDialogMode("edit");
  };

  const closeDialog = () => { setDialogMode(null); setEditingUser(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("الاسم والبريد الإلكتروني مطلوبان");
      return;
    }
    if (dialogMode === "create" && !form.password.trim()) {
      toast.error("كلمة المرور مطلوبة عند إنشاء مستخدم جديد");
      return;
    }
    setSaving(true);
    try {
      if (dialogMode === "create") {
        await apiClient.post("/admin/users", {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          role: form.role,
        });
        toast.success("تم إضافة المستخدم بنجاح");
      } else if (editingUser) {
        const payload: Record<string, string> = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        };
        if (form.password.trim()) payload.password = form.password.trim();
        await apiClient.put(`/admin/users/${editingUser.id}`, payload);
        toast.success("تم تعديل بيانات المستخدم");
      }
      closeDialog();
      fetchUsers();
    } catch (err: any) {
      const msg = err?.errors
        ? Object.values(err.errors as Record<string, string[]>).flat().join(" — ")
        : (err?.message ?? "حدث خطأ");
      toast.error("فشل الحفظ", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiClient.delete(`/admin/users/${deleteTarget.id}`);
      toast.success("تم حذف المستخدم");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message ?? "فشل الحذف");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (user: User) => {
    try {
      await apiClient.post(`/admin/users/${user.id}/toggle-status`);
      toast.success(user.isActive ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
      fetchUsers();
    } catch {
      toast.error("فشل تغيير حالة الحساب");
    }
  };

  const filteredUsers = useMemo(
    () => users.filter((u) => matchesUser(u, search)).slice(0, 250),
    [users, search]
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchUsers} />;

  return (
    <div className="space-y-4">
      {/* Search + actions */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pr-10"
            placeholder="بحث بالاسم أو الرقم المالي أو الإدارة أو الدور..."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Download className="ml-2 h-4 w-4" />
            تصدير
          </Button>
          <Button onClick={openCreate}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة مستخدم
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState message={search ? "لا توجد نتائج مطابقة للبحث" : "لا يوجد مستخدمين مسجلين"} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">الدور</th>
                  <th className="p-3 text-right">الإدارة</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{user.name}</td>
                    <td className="p-3">
                      <Badge variant="outline">{roleLabel(user.role)}</Badge>
                    </td>
                    <td className="p-3 text-slate-600">{user.department || "غير محدد"}</td>
                    <td className="p-3">
                      <Badge className={user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {user.isActive ? "مفعّل" : "معطّل"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="تعديل" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className={`h-8 w-8 p-0 ${user.isActive ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}`}
                          title={user.isActive ? "تعطيل" : "تفعيل"}
                          onClick={() => handleToggle(user)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" title="حذف" onClick={() => setDeleteTarget(user)}>
                          <Trash2 className="h-4 w-4" />
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
        يتم عرض أول 250 نتيجة فقط. إجمالي المستخدمين: {users.length}
      </p>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "إضافة مستخدم جديد" : "تعديل بيانات المستخدم"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create" ? "أدخل بيانات المستخدم الجديد." : "عدّل البيانات المطلوبة."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الاسم الكامل</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="محمد أحمد" />
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@company.com" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>{dialogMode === "create" ? "كلمة المرور" : "كلمة المرور الجديدة (اختياري)"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={dialogMode === "edit" ? "اترك فارغاً للإبقاء على الحالية" : ""} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>الدور الوظيفي</Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {backendRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              {dialogMode === "create" ? "إضافة" : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المستخدم <span className="font-bold text-slate-900">{deleteTarget?.name}</span>؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
              حذف
            </Button>
          </DialogFooter>
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
        user.permissions.forEach((permission) => {
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
interface ApiDepartment {
  id: string;
  name: string;
  manager_id?: string | null;
  manager_name?: string | null;
  employee_count?: number;
}

type DeptForm = { name: string; manager_id: string };
const emptyDeptForm: DeptForm = { name: "", manager_id: "" };

function DepartmentsTab() {
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingDept, setEditingDept] = useState<ApiDepartment | null>(null);
  const [form, setForm] = useState<DeptForm>(emptyDeptForm);
  const [deleteTarget, setDeleteTarget] = useState<ApiDepartment | null>(null);

  // We also need a list of users to pick a manager. Fetch them separately.
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/admin/departments");
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setDepartments(items.map((d: any) => ({
        id:             String(d.id),
        name:           d.name,
        manager_id:     d.manager_id ? String(d.manager_id) : null,
        manager_name:   d.manager?.name ?? null,
        employee_count: d.employee_count ?? 0,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الإدارات");
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res: any = await apiClient.get("/admin/users?per_page=500");
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setManagers(items.map((u: any) => ({ id: String(u.id), name: u.name ?? "" })));
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchDepartments(); fetchManagers(); }, []);

  const openCreate = () => {
    setEditingDept(null);
    setForm(emptyDeptForm);
    setDialogMode("create");
  };

  const openEdit = (dept: ApiDepartment) => {
    setEditingDept(dept);
    setForm({ name: dept.name, manager_id: dept.manager_id ?? "" });
    setDialogMode("edit");
  };

  const closeDialog = () => { setDialogMode(null); setEditingDept(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("اسم الإدارة مطلوب"); return; }
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        name: form.name.trim(),
        manager_id: form.manager_id || null,
      };
      if (dialogMode === "create") {
        await apiClient.post("/admin/departments", payload);
        toast.success("تم إنشاء الإدارة");
      } else if (editingDept) {
        await apiClient.put(`/admin/departments/${editingDept.id}`, payload);
        toast.success("تم تعديل الإدارة");
      }
      closeDialog();
      fetchDepartments();
    } catch (err: any) {
      toast.error("فشل الحفظ", { description: err?.message ?? "حدث خطأ" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiClient.delete(`/admin/departments/${deleteTarget.id}`);
      toast.success("تم حذف الإدارة");
      setDeleteTarget(null);
      fetchDepartments();
    } catch (err: any) {
      toast.error(err?.message ?? "فشل الحذف");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? departments.filter((d) => d.name.toLowerCase().includes(term) || (d.manager_name ?? "").toLowerCase().includes(term))
      : departments;
  }, [departments, search]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchDepartments} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pr-10"
            placeholder="بحث باسم الإدارة أو المدير..."
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة إدارة
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={search ? "لا توجد نتائج مطابقة" : "لا توجد إدارات مسجلة"} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((dept) => (
            <Card key={dept.id}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-bold text-slate-900">{dept.name}</h3>
                  {dept.employee_count !== undefined && dept.employee_count > 0 && (
                    <Badge className="bg-teal-100 text-teal-700">{dept.employee_count} فرد</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  المسؤول: <span className="font-semibold">{dept.manager_name || "غير محدد"}</span>
                </p>
                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(dept)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => setDeleteTarget(dept)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "إضافة إدارة جديدة" : "تعديل الإدارة"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create" ? "أدخل بيانات الإدارة الجديدة." : "عدّل البيانات المطلوبة."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>اسم الإدارة</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: إدارة الموارد البشرية"
              />
            </div>
            <div className="space-y-1.5">
              <Label>المدير المسؤول (اختياري)</Label>
              <Select value={form.manager_id || "none"} onValueChange={(v) => setForm({ ...form, manager_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مديراً" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مدير</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              {dialogMode === "create" ? "إضافة" : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف إدارة <span className="font-bold text-slate-900">{deleteTarget?.name}</span>؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Employees Tab ────────────────────────────────────────────────────
type ApiEmployee = {
  id: number;
  financial_number: string;
  national_id?: string;
  job_title?: string;
  type: "active" | "retired";
  phone?: string;
  department?: { id: number; name: string };
  user?: { id: number; name: string; email: string; is_active: boolean };
};

type EmpForm = {
  name: string; email: string; password: string;
  financial_number: string; national_id: string;
  department_id: string; job_title: string;
  type: "active" | "retired"; phone: string;
};

const emptyEmpForm: EmpForm = {
  name: "", email: "", password: "",
  financial_number: "", national_id: "",
  department_id: "", job_title: "",
  type: "active", phone: "",
};

function EmployeesTab() {
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [dialogMode, setDialogMode]     = useState<"create" | "edit" | null>(null);
  const [editingEmp, setEditingEmp]     = useState<ApiEmployee | null>(null);
  const [form, setForm]                 = useState<EmpForm>(emptyEmpForm);
  const [deleteTarget, setDeleteTarget] = useState<ApiEmployee | null>(null);

  const fetchEmployees = async () => {
    setLoading(true); setError(null);
    try {
      const res: any = await apiClient.get("/admin/employees?per_page=500");
      setEmployees(Array.isArray(res) ? res : (res?.data ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الموظفين");
    } finally { setLoading(false); }
  };

  const fetchDepts = async () => {
    try {
      const res: any = await apiClient.get("/admin/departments");
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setDepartments(items.map((d: any) => ({ id: String(d.id), name: d.name })));
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchEmployees(); fetchDepts(); }, []);

  const openCreate = () => { setEditingEmp(null); setForm(emptyEmpForm); setDialogMode("create"); };
  const openEdit = (emp: ApiEmployee) => {
    setEditingEmp(emp);
    setForm({
      name: emp.user?.name ?? "", email: emp.user?.email ?? "", password: "",
      financial_number: emp.financial_number, national_id: emp.national_id ?? "",
      department_id: emp.department ? String(emp.department.id) : "",
      job_title: emp.job_title ?? "", type: emp.type, phone: emp.phone ?? "",
    });
    setDialogMode("edit");
  };
  const closeDialog = () => { setDialogMode(null); setEditingEmp(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.financial_number.trim()) {
      toast.error("الاسم والرقم المالي مطلوبان"); return;
    }
    if (dialogMode === "create" && (!form.email.trim() || !form.password.trim())) {
      toast.error("البريد الإلكتروني وكلمة المرور مطلوبان للإضافة"); return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        name: form.name.trim(), email: form.email.trim(),
        financial_number: form.financial_number.trim(),
        national_id: form.national_id.trim() || null,
        department_id: form.department_id || null,
        job_title: form.job_title.trim() || null,
        type: form.type, phone: form.phone.trim() || null,
      };
      if (form.password.trim()) payload.password = form.password.trim();

      if (dialogMode === "create") {
        await apiClient.post("/admin/employees", payload);
        toast.success("تم إضافة الموظف بنجاح");
      } else if (editingEmp) {
        await apiClient.put(`/admin/employees/${editingEmp.id}`, payload);
        toast.success("تم تعديل بيانات الموظف");
      }
      closeDialog(); fetchEmployees();
    } catch (err: any) {
      const msg = err?.errors
        ? Object.values(err.errors as Record<string, string[]>).flat().join(" — ")
        : (err?.message ?? "حدث خطأ");
      toast.error("فشل الحفظ", { description: msg });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiClient.delete(`/admin/employees/${deleteTarget.id}`);
      toast.success("تم حذف الموظف");
      setDeleteTarget(null); fetchEmployees();
    } catch (err: any) {
      toast.error(err?.message ?? "فشل الحذف");
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) =>
      (e.user?.name ?? "").toLowerCase().includes(term) ||
      e.financial_number.toLowerCase().includes(term) ||
      (e.department?.name ?? "").toLowerCase().includes(term) ||
      (e.job_title ?? "").toLowerCase().includes(term)
    );
  }, [employees, search]);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} onRetry={fetchEmployees} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-11 pr-10" placeholder="بحث بالاسم أو الرقم المالي أو الإدارة..." />
        </div>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />إضافة موظف
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={search ? "لا توجد نتائج مطابقة" : "لا يوجد موظفون مسجلون"} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">الرقم المالي</th>
                  <th className="p-3 text-right">الإدارة</th>
                  <th className="p-3 text-right">المسمى الوظيفي</th>
                  <th className="p-3 text-right">النوع</th>
                  <th className="p-3 text-right">التليفون</th>
                  <th className="p-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{emp.user?.name ?? "—"}</td>
                    <td className="p-3 font-mono text-slate-700">{emp.financial_number}</td>
                    <td className="p-3 text-slate-600">{emp.department?.name ?? "غير محدد"}</td>
                    <td className="p-3 text-slate-600">{emp.job_title ?? "غير محدد"}</td>
                    <td className="p-3">
                      <Badge className={emp.type === "active" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}>
                        {emp.type === "active" ? "موظف" : "معاش"}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-500">
                      {emp.phone ? (
                        <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{emp.phone}</span>
                      ) : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(emp)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => setDeleteTarget(emp)}>
                          <Trash2 className="h-4 w-4" />
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

      <p className="text-center text-xs text-slate-500">إجمالي الموظفين: {employees.length}</p>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "إضافة موظف جديد" : "تعديل بيانات الموظف"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>الاسم الكامل</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="محمد أحمد علي" />
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@asorc.com" />
            </div>
            <div className="space-y-1.5">
              <Label>{dialogMode === "create" ? "كلمة المرور" : "كلمة المرور الجديدة (اختياري)"}</Label>
              <Input type="password" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>الرقم المالي</Label>
              <Input dir="ltr" value={form.financial_number} onChange={(e) => setForm({ ...form, financial_number: e.target.value })} placeholder="EMP-001" />
            </div>
            <div className="space-y-1.5">
              <Label>الرقم القومي</Label>
              <Input dir="ltr" maxLength={14} value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} placeholder="12345678901234" />
            </div>
            <div className="space-y-1.5">
              <Label>الإدارة</Label>
              <Select value={form.department_id || "none"} onValueChange={(v) => setForm({ ...form, department_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="اختر إدارة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون إدارة</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>المسمى الوظيفي</Label>
              <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="مهندس أول" />
            </div>
            <div className="space-y-1.5">
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={(v: "active" | "retired") => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">موظف عامل</SelectItem>
                  <SelectItem value="retired">صاحب معاش</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>رقم التليفون</Label>
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              {dialogMode === "create" ? "إضافة" : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف الموظف <span className="font-bold text-slate-900">{deleteTarget?.user?.name}</span>؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      const res: any = await apiClient.get("/admin/audit-logs?per_page=500");
      setLogs(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل سجل العمليات");
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
      const res: any = await apiClient.get("/admin/users?per_page=500");
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      const fetchedUsers: User[] = items.map((u: any) => ({
        id:              String(u.id),
        username:        u.email ?? "",
        password:        "",
        name:            u.name ?? "",
        financialNumber: u.financial_number ?? "",
        jobTitle:        u.job_title ?? "",
        department:      u.department ?? "",
        workType:        u.work_type ?? "",
        role:            (Array.isArray(u.roles) ? u.roles[0] : u.role) ?? "employee",
        permissions:     [],
        isActive:        u.is_active !== false,
      }));
      setUsers(fetchedUsers);

      // Fetch audit logs count separately (best-effort)
      try {
        const logsRes: any = await apiClient.get("/admin/audit-logs?per_page=1");
        setAuditLogsCount(logsRes?.meta?.total ?? 0);
      } catch {
        setAuditLogsCount(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل بيانات المستخدمين");
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
          <TabsTrigger value="employees" className="gap-1.5 text-xs">
            <UserCheck className="h-3.5 w-3.5" />
            الموظفون
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
          <DepartmentsTab />
        </TabsContent>
        <TabsContent value="employees">
          <EmployeesTab />
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