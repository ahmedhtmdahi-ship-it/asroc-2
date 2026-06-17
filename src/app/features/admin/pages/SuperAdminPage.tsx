import { useMemo, useState } from "react";
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
} from "lucide-react";

import { PageLayout } from "@/app/components/PageLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { mockUsers } from "@/app/data/mockUsers";
import { MedicineInventoryManager } from "@/app/features/pharmacy/components/MedicineInventoryManager";
import { auditStore } from "@/app/store/auditStore";
import type { Permission, User, UserRole } from "@/app/types/user";

const roleLabels: Record<UserRole, string> = {
  employee: "Ù…ÙˆØ¸Ù",
  manager: "Ù…Ø¯ÙŠØ±/Ù…ÙƒÙ„Ù",
  office_manager: "Ù…Ø¯ÙŠØ± Ù…ÙƒØªØ¨",
  security: "Ø£Ù…Ù†",
  doctor: "Ø·Ø¨ÙŠØ¨",
  pharmacy: "ØµÙŠØ¯Ù„ÙŠØ©",
  medical_admin: "Ø¥Ø¯Ø§Ø±Ø© Ø·Ø¨ÙŠØ©",
  pension_admin: "Ø¥Ø¯Ø§Ø±Ø© Ù…Ø¹Ø§Ø´Ø§Øª",
  super_admin: "Ù…Ø´Ø±Ù Ù†Ø¸Ø§Ù…",
};

const permissionLabels: Record<Permission, string> = {
  create_request: "Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨",
  view_own_requests: "Ø¹Ø±Ø¶ Ø·Ù„Ø¨Ø§ØªÙŠ",
  view_medical_history: "Ø¹Ø±Ø¶ Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ø·Ø¨ÙŠ",
  approve_request: "Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø·Ù„Ø¨Ø§Øª",
  reject_request: "Ø±ÙØ¶ Ø§Ù„Ø·Ù„Ø¨Ø§Øª",
  postpone_request: "ØªØ£Ø¬ÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨Ø§Øª",
  security_check_out: "ØªØ³Ø¬ÙŠÙ„ Ø®Ø±ÙˆØ¬ Ø§Ù„Ø£Ù…Ù†",
  security_check_in: "ØªØ³Ø¬ÙŠÙ„ Ø¹ÙˆØ¯Ø© Ø§Ù„Ø£Ù…Ù†",
  diagnose_patient: "ØªØ´Ø®ÙŠØµ Ø§Ù„Ù…Ø±Ø¶Ù‰",
  create_prescription: "ÙƒØªØ§Ø¨Ø© Ø±ÙˆØ´ØªØ©",
  create_referral: "Ø¥Ù†Ø´Ø§Ø¡ ØªØ­ÙˆÙŠÙ„",
  create_sick_leave: "Ø¥Ø¬Ø§Ø²Ø© Ù…Ø±Ø¶ÙŠØ©",
  recommend_monthly_treatment: "ØªÙˆØµÙŠØ© Ø¹Ù„Ø§Ø¬ Ø´Ù‡Ø±ÙŠ",
  dispense_prescription: "ØµØ±Ù Ø±ÙˆØ´ØªØ©",
  manage_inventory: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†",
  approve_referral: "Ø§Ø¹ØªÙ…Ø§Ø¯ ØªØ­ÙˆÙŠÙ„",
  manage_monthly_treatment: "Ø¥Ø¯Ø§Ø±Ø© Ø¹Ù„Ø§Ø¬ Ø´Ù‡Ø±ÙŠ",
  manage_pensioners: "Ø¥Ø¯Ø§Ø±Ø© Ù…Ø¹Ø§Ø´Ø§Øª",
  manage_contracts: "Ø¥Ø¯Ø§Ø±Ø© ØªØ¹Ø§Ù‚Ø¯Ø§Øª",
  manage_pharmacy: "Ø¥Ø¯Ø§Ø±Ø© ØµÙŠØ¯Ù„ÙŠØ©",
  manage_system: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù†Ø¸Ø§Ù…",
  manage_referrals: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª",
  dispense_regular_treatment: "ØµØ±Ù Ø¹Ù„Ø§Ø¬ Ø¹Ø§Ø¯ÙŠ",
  dispense_monthly_treatment: "ØµØ±Ù Ø¹Ù„Ø§Ø¬ Ø´Ù‡Ø±ÙŠ",
  view_reports: "Ø¹Ø±Ø¶ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±",
  print_documents: "Ø·Ø¨Ø§Ø¹Ø© Ù…Ø³ØªÙ†Ø¯Ø§Øª",
  view_audit_log: "Ø³Ø¬Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª",
  all: "ÙƒÙ„ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª",
};

function roleLabel(role: UserRole) {
  return roleLabels[role] || role;
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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  icon: any;
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

function UsersTab() {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    return mockUsers.filter((user) => matchesUser(user, search)).slice(0, 250);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 pr-10"
            placeholder="Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø§Ù„ÙŠ Ø£Ùˆ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø£Ùˆ Ø§Ù„Ø¯ÙˆØ±..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Download className="ml-2 h-4 w-4" />
            ØªØµØ¯ÙŠØ±
          </Button>
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            Ø¥Ø¶Ø§ÙØ© Ù…Ø³ØªØ®Ø¯Ù…
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-right">Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ø§Ù„ÙŠ</th>
                <th className="p-3 text-right">Ø§Ù„Ø§Ø³Ù…</th>
                <th className="p-3 text-right">Ø§Ù„Ø¯ÙˆØ±</th>
                <th className="p-3 text-right">Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©</th>
                <th className="p-3 text-right">Ø§Ù„ÙˆØ¸ÙŠÙØ©</th>
                <th className="p-3 text-right">Ø·Ø¨ÙŠØ¹Ø© Ø§Ù„Ø¹Ù…Ù„</th>
                <th className="p-3 text-right">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">{user.financialNumber}</td>
                  <td className="p-3 font-semibold text-slate-900">{user.name}</td>
                  <td className="p-3">
                    <Badge variant="outline">{roleLabel(user.role)}</Badge>
                  </td>
                  <td className="p-3 text-slate-600">{user.department || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}</td>
                  <td className="p-3 text-slate-600">{user.jobTitle || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}</td>
                  <td className="p-3 text-slate-600">{user.workType || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}</td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        ÙŠØªÙ… Ø¹Ø±Ø¶ Ø£ÙˆÙ„ 250 Ù†ØªÙŠØ¬Ø© ÙÙ‚Ø· Ù„Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Ø³Ø±Ø¹Ø© Ø§Ù„ØµÙØ­Ø©. Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†: {mockUsers.length}
      </p>
    </div>
  );
}

function RolesTab() {
  const roleStats = Object.entries(
    mockUsers.reduce<Record<string, number>>((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {})
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {roleStats.map(([role, count]) => {
        const usersInRole = mockUsers.filter((user) => user.role === role);
        const permissions = new Set(usersInRole.flatMap((user) => user.permissions));

        return (
          <Card key={role}>
            <CardContent className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{roleLabel(role as UserRole)}</h3>
                  <p className="mt-1 text-xs text-slate-500">{role}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700">{count} Ù…Ø³ØªØ®Ø¯Ù…</Badge>
              </div>
              <p className="text-sm text-slate-600">
                {permissions.size} ØµÙ„Ø§Ø­ÙŠØ© Ù…ÙØ¹Ù„Ø© Ø¶Ù…Ù† Ù‡Ø°Ø§ Ø§Ù„Ø¯ÙˆØ±.
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PermissionsTab() {
  const permissionStats = Object.entries(
    mockUsers.reduce<Record<string, number>>((acc, user) => {
      user.permissions.forEach((permission) => {
        acc[permission] = (acc[permission] || 0) + 1;
      });
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-right">Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©</th>
              <th className="p-3 text-right">Ø§Ù„ÙƒÙˆØ¯</th>
              <th className="p-3 text-right">Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {permissionStats.map(([permission, count]) => (
              <tr key={permission}>
                <td className="p-3 font-semibold">
                  {permissionLabels[permission as Permission] || permission}
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

function DepartmentsTab() {
  const departments = useMemo(() => {
    const map = new Map<string, { name: string; count: number; managers: User[] }>();

    mockUsers.forEach((user) => {
      const name = user.department || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯";
      const current = map.get(name) || { name, count: 0, managers: [] };
      current.count += 1;
      if (user.role === "manager") current.managers.push(user);
      map.set(name, current);
    });

    return [...map.values()].sort((a, b) => b.count - a.count);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {departments.map((department) => (
        <Card key={department.name}>
          <CardContent className="p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-bold text-slate-900">{department.name}</h3>
              <Badge className="bg-teal-100 text-teal-700">{department.count} ÙØ±Ø¯</Badge>
            </div>
            <p className="text-sm text-slate-600">
              Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„:{" "}
              <span className="font-semibold">
                {department.managers[0]?.name || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}
              </span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RoleUsersTab({ role }: { role: UserRole }) {
  const users = mockUsers.filter((user) => user.role === role);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{user.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{user.financialNumber}</p>
              </div>
              <Badge variant="outline">{roleLabel(user.role)}</Badge>
            </div>
            <p className="text-sm text-slate-600">{user.jobTitle || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}</p>
            <p className="mt-1 text-sm text-slate-500">{user.department || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MedicinesTab() {
  return <MedicineInventoryManager />;
}

function AuditLogsTab() {
  const auditLogs = auditStore.getAll().slice().reverse();

  if (auditLogs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
        Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹Ù…Ù„ÙŠØ§Øª Ù…Ø³Ø¬Ù„Ø© Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.
      </div>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-right">Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</th>
              <th className="p-3 text-right">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th>
              <th className="p-3 text-right">Ø§Ù„Ø·Ù„Ø¨</th>
              <th className="p-3 text-right">Ù…Ù†</th>
              <th className="p-3 text-right">Ø¥Ù„Ù‰</th>
              <th className="p-3 text-right">Ø§Ù„ØªÙˆÙ‚ÙŠØª</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {auditLogs.map((log: any) => (
              <tr key={log.id}>
                <td className="p-3 font-semibold">{log.userName || log.user || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}</td>
                <td className="p-3">{log.action || "ØªØ­Ø¯ÙŠØ«"}</td>
                <td className="p-3">{log.requestId || "-"}</td>
                <td className="p-3">{log.statusBefore || "-"}</td>
                <td className="p-3">{log.statusAfter || "-"}</td>
                <td className="p-3 text-xs text-slate-500">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString("ar-EG") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function SuperAdminPage() {
  const auditLogs = auditStore.getAll();
  const totalDepartments = new Set(mockUsers.map((user) => user.department || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯")).size;

  return (
    <PageLayout
      title="Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ù„ÙŠØ§ Ù„Ù„Ù†Ø¸Ø§Ù…"
      subtitle="Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† ÙˆØ§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª Ø·Ø¨Ù‚Ø§Ù‹ Ù„Ø´ÙŠØªØ§Øª Ø§Ù„Ø´Ø±ÙƒØ©"
      icon={<Settings className="h-5 w-5 text-white" />}
      backLink="/dashboard"
    >
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†" value={mockUsers.length} icon={Users} color="text-blue-700" bg="bg-blue-50" />
        <StatCard label="Ø§Ù„Ø£Ø¯ÙˆØ§Ø± Ø§Ù„ÙØ¹Ù„ÙŠØ©" value={new Set(mockUsers.map((user) => user.role)).size} icon={Shield} color="text-purple-700" bg="bg-purple-50" />
        <StatCard label="Ø§Ù„Ø¥Ø¯Ø§Ø±Ø§Øª" value={totalDepartments} icon={Building} color="text-teal-700" bg="bg-teal-50" />
        <StatCard label="Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª" value={auditLogs.length} icon={ClipboardList} color="text-orange-700" bg="bg-orange-50" />
      </div>

      <Tabs defaultValue="users" dir="rtl">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ†</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />Ø§Ù„Ø£Ø¯ÙˆØ§Ø±</TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" />Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª</TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5 text-xs"><Building className="h-3.5 w-3.5" />Ø§Ù„Ø¥Ø¯Ø§Ø±Ø§Øª</TabsTrigger>
          <TabsTrigger value="doctors" className="gap-1.5 text-xs"><Stethoscope className="h-3.5 w-3.5" />Ø§Ù„Ø£Ø·Ø¨Ø§Ø¡</TabsTrigger>
          <TabsTrigger value="pharmacies" className="gap-1.5 text-xs"><Store className="h-3.5 w-3.5" />Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©</TabsTrigger>
          <TabsTrigger value="medicines" className="gap-1.5 text-xs"><Package className="h-3.5 w-3.5" />Ø§Ù„Ø£Ø¯ÙˆÙŠØ©</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" />Ø§Ù„Ø³Ø¬Ù„</TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="permissions"><PermissionsTab /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="doctors"><RoleUsersTab role="doctor" /></TabsContent>
        <TabsContent value="pharmacies"><RoleUsersTab role="pharmacy" /></TabsContent>
        <TabsContent value="medicines"><MedicinesTab /></TabsContent>
        <TabsContent value="audit"><AuditLogsTab /></TabsContent>
      </Tabs>
    </PageLayout>
  );
}


