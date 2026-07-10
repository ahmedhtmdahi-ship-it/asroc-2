import { useEffect, useMemo, useState } from "react";
import {
  Building,
  ClipboardList,
  Package,
  Settings,
  Shield,
  Stethoscope,
  Store,
  Users,
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { StatCard } from "@/app/components/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { MedicineInventoryManager } from "@/app/features/pharmacy/components/MedicineInventoryManager";
import { countAuditLogsApi, listUsersApi } from "@/app/lib/dataApi";
import type { User } from "@/app/types/user";

import { AuditLogsTab } from "../components/AuditLogsTab";
import { DepartmentsTab } from "../components/DepartmentsTab";
import { PermissionsTab } from "../components/PermissionsTab";
import { RolesTab } from "../components/RolesTab";
import { RoleUsersTab } from "../components/RoleUsersTab";
import { UsersTab } from "../components/UsersTab";
import { ErrorState, LoadingState } from "../components/adminShared";
import { apiUserToUser } from "../lib/adminMappers";

export function SuperAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogsCount, setAuditLogsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetch واحد للصفحة كلها — UsersTab بياخد users كـ prop بدل ما يجيبهم تاني.
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

  const handleUserUpdated = (updated: User) =>
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

  const handleUserCreated = (created: User) =>
    setUsers((prev) => [created, ...prev]);

  const totalDepartments = useMemo(
    () => new Set(users.map((user) => user.department || "غير محدد")).size,
    [users]
  );

  const pageProps = {
    title: "الإدارة العليا للنظام",
    subtitle: "إدارة المستخدمين والصلاحيات",
    icon: <Settings className="h-5 w-5 text-white" />,
    backLink: "/dashboard",
  };

  if (loading) {
    return (
      <PageLayout {...pageProps}>
        <LoadingState />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout {...pageProps}>
        <ErrorState message={error} onRetry={fetchData} />
      </PageLayout>
    );
  }

  return (
    <PageLayout {...pageProps} subtitle="إدارة المستخدمين والصلاحيات طبقاً لشيتات الشركة">
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
          <UsersTab
            users={users}
            onUserUpdated={handleUserUpdated}
            onUserCreated={handleUserCreated}
          />
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
          <MedicineInventoryManager />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
