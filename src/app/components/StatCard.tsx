import type { ComponentType } from "react";
import { Link } from "react-router";

import { Card, CardContent } from "@/app/components/ui/card";

/**
 * كارت إحصائية موحّد — كان له ~10 نسخ inline متشابهة في الصفحات.
 *
 * - مع `icon`: أيقونة في فقاعة ملوّنة والقيمة جنبها (النمط الغالب).
 * - من غير `icon`: قيمة وعنوان متمركزين (نمط صفحات المعاشات/التاريخ الطبي).
 * - مع `link`: الكارت كله بيبقى لينك (نمط الداشبورد).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-slate-900",
  bg = "bg-slate-50",
  link,
}: {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  color?: string;
  bg?: string;
  link?: string;
}) {
  const card = (
    <Card className={link ? "h-full transition hover:shadow-md" : undefined}>
      <CardContent className="p-5">
        {Icon ? (
          <div className="flex items-center justify-between gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-1 text-sm text-slate-600">{label}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return link ? <Link to={link}>{card}</Link> : card;
}
