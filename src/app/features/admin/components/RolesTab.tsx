import { useMemo } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import type { User, UserRole } from "@/app/types/user";
import { roleLabel } from "../lib/adminMappers";
import { EmptyState } from "./adminShared";

export function RolesTab({ users }: { users: User[] }) {
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
