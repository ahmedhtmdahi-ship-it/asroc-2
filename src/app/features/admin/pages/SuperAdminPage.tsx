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
import { Card, CardContent } from "@/app/components/ui/card";
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
import { MedicineInventoryManager } from "@/app/features/pharmacy/components/MedicineInventoryManager";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { supabase } from "@/app/lib/api";
import { profileRowToUser } from "@/app/features/auth/AuthContext";
import type { Permission, User, UserRole } from "@/app/types/user";

// Loaded lazily so their weight (1MB+) never lands in the main bundle
async function getMockUsers() {
  const { mockUsers } = await import("@/app/data/mockUsers");
  return mockUsers;
}
async function getMockAuditLogs() {
  const { mockAuditLogs } = await import("@/app/data/mockAuditLogs");
  return mockAuditLogs;
}

const isDev = (typeof import.meta !== "undefined" ? (import.meta as any).env?.DEV : false) || false;

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

// Permissions editor component
function PermissionsEditor({
  user,
  onSave,
  onCancel,
}: {
  user: User;
    onSave: (userId: string, newPermissions: Permission[]) => void;
  onCancel: () => void;
}) {
  const allPermissions = Object.keys(permissionLabels) as Permission[];
    const [selected, setSelected] = useState<Permission[]>((user.permissions || []) as Permission[]);

  useEffect(() => {
    setSelected(user.permissions || []);
  }, [user]);

    function toggle(p: Permission) {
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
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supaError } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true });

      if (supaError) throw supaError;
      setUsers((data ?? []).map(profileRowToUser));
    } catch {
      getMockUsers().then(setUsers);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleChangeRole(userId: string, newRole: UserRole) {
    setSavingRoleId(userId);
    try {
            const { error } = await (supabase.from("profiles").update({ role: newRole }) as any).eq("id", userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch {
      // silently keep old value on error
    } finally {
      setSavingRoleId(null);
    }
  }

    async function handleSavePermissions(userId: string, newPermissions: Permission[]) {
    try {
      // update remote
            const { error: upErr } = await (supabase.from("profiles").update({ permissions: newPermissions }) as any).eq("id", userId);
      if (upErr) throw upErr;

      // update local state
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permissions: newPermissions } : u)));
      setPermissionsOpen(false);
      setEditingUser(null);
    } catch (err) {
      // fallback: update local only
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permissions: newPermissions } : u)));
      setPermissionsOpen(false);
      setEditingUser(null);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => matchesUser(user, search)).slice(0, 250);
  }, [users, search]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchUsers} />;

  return (
    <div className="space-y-4">
      {isDev && (
        <div className="rounded-md bg-yellow-50 p-2 text-xs text-amber-800">Debug: users={users.length} loading={String(loading)} error={String(error)}</div>
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
          <Button variant="outline">
            <Download className="ml-2 h-4 w-4" />
            تصدير
          </Button>
          <Button>
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
                        disabled={savingRoleId === user.id}
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
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
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

      {/* Permissions editor modal */}
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
      if (user.role === "manager") current.managers.push(user);
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
      const { data, error: supaError } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (supaError) throw supaError;
      setLogs(data || []);
    } catch {
      getMockAuditLogs().then(m => setLogs(m as unknown as AuditLog[]));
      setError(null);
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
      // Attempt Supabase first
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true });

      if (usersError) throw usersError;

      setUsers((usersData ?? []).map(profileRowToUser));

      const { count, error: countError } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;
      setAuditLogsCount(count || 0);
    } catch {
      // Fallback to mock data so the page isn't empty without backend setup
      getMockUsers().then(setUsers);
      getMockAuditLogs().then(m => setAuditLogsCount(m.length));
      setError(null);
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
          <ErrorBoundary><UsersTab /></ErrorBoundary>
        </TabsContent>
        <TabsContent value="roles">
          <ErrorBoundary><RolesTab users={users} /></ErrorBoundary>
        </TabsContent>
        <TabsContent value="permissions">
          <ErrorBoundary><PermissionsTab users={users} /></ErrorBoundary>
        </TabsContent>
        <TabsContent value="departments">
          <ErrorBoundary><DepartmentsTab users={users} /></ErrorBoundary>
        </TabsContent>
        <TabsContent value="doctors">
          <ErrorBoundary><RoleUsersTab role="doctor" users={users} /></ErrorBoundary>
        </TabsContent>
        <TabsContent value="pharmacies">
          <ErrorBoundary><RoleUsersTab role="pharmacy" users={users} /></ErrorBoundary>
        </TabsContent>
        <TabsContent value="medicines">
          <ErrorBoundary><MedicinesTab /></ErrorBoundary>
        </TabsContent>
        <TabsContent value="audit">
          <ErrorBoundary><AuditLogsTab /></ErrorBoundary>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}