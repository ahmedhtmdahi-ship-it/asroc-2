import { useMemo } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import type { User, UserRole } from "@/app/types/user";
import { roleLabel } from "../lib/adminMappers";
import { EmptyState } from "./adminShared";

export function RoleUsersTab({ role, users }: { role: UserRole; users: User[] }) {
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
