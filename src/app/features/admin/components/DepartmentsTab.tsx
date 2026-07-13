import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { normalizeArabicText } from "@/app/lib/arabic";
import type { User } from "@/app/types/user";

import { roleLabel } from "../lib/adminMappers";
import { EmptyState } from "./adminShared";

interface DeptGroup {
  name: string;
  members: User[];
  managers: User[];
}

export function DepartmentsTab({ users }: { users: User[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DeptGroup | null>(null);

  const departments = useMemo(() => {
    const map = new Map<string, DeptGroup>();

    users.forEach((user) => {
      const name = user.department || "غير محدد";
      const current = map.get(name) || { name, members: [], managers: [] };
      current.members.push(user);
      if (user.role === "manager" || user.role === "office_manager") current.managers.push(user);
      map.set(name, current);
    });

    return [...map.values()].sort((a, b) => b.members.length - a.members.length);
  }, [users]);

  // فلتر بالاسم — بنستخدم توحيد النص العربي عشان البحث يلاقي رغم اختلاف صور الحروف.
  const filtered = useMemo(() => {
    const term = normalizeArabicText(search);
    if (!term) return departments;
    return departments.filter((d) => normalizeArabicText(d.name).includes(term));
  }, [departments, search]);

  if (users.length === 0) return <EmptyState message="لا توجد بيانات مستخدمين" />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-xl">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="h-11 pr-10"
          placeholder="بحث باسم الإدارة..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="لا توجد إدارة مطابقة للبحث" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((department) => (
            <Card
              key={department.name}
              role="button"
              tabIndex={0}
              className="cursor-pointer transition hover:border-teal-300 hover:shadow-md"
              onClick={() => setSelected(department)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(department);
                }
              }}
            >
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-bold text-slate-900">{department.name}</h3>
                  <Badge className="bg-teal-100 text-teal-700">{department.members.length} فرد</Badge>
                </div>
                <p className="text-sm text-slate-600">
                  المسؤول:{" "}
                  <span className="font-semibold">
                    {department.managers[0]?.name || "غير محدد"}
                  </span>
                </p>
                <p className="mt-2 text-xs font-medium text-teal-700">اضغط لعرض أعضاء الإدارة</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* عرض أعضاء الإدارة عند الضغط عليها — البيانات من نفس قائمة المستخدمين (مفيش نداء زيادة). */}
      <Dialog open={!!selected} onOpenChange={(open: boolean) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.members.length} فرد — المسؤول: {selected?.managers[0]?.name || "غير محدد"}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-right">الاسم</th>
                  <th className="p-2 text-right">الرقم المالي</th>
                  <th className="p-2 text-right">الدور</th>
                  <th className="p-2 text-right">الوظيفة</th>
                  <th className="p-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selected?.members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-2 font-semibold text-slate-900">{m.name}</td>
                    <td className="p-2 font-mono text-xs">{m.financialNumber || "—"}</td>
                    <td className="p-2">{roleLabel(m.role)}</td>
                    <td className="p-2 text-slate-600">{m.jobTitle || "—"}</td>
                    <td className="p-2">
                      <Badge className={m.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {m.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            لتعديل أي عضو: من تاب «المستخدمون» ابحث باسمه أو رقمه المالي.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
