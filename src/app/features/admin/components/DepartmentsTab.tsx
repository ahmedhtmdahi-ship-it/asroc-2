import { useMemo } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import type { User } from "@/app/types/user";
import { EmptyState } from "./adminShared";

export function DepartmentsTab({ users }: { users: User[] }) {
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
