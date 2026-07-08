import { useMemo } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import type { Permission, User } from "@/app/types/user";
import { permissionLabel } from "../lib/adminMappers";
import { EmptyState } from "./adminShared";

export function PermissionsTab({ users }: { users: User[] }) {
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
