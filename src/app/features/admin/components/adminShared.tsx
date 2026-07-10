import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import type { Permission, User } from "@/app/types/user";
import { permissionLabel, permissionLabels } from "../lib/adminMappers";

// StatCard الموحّد موجود في @/app/components/StatCard

export function LoadingState() {
  return (
    <div className="flex h-48 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
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

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
      {message}
    </div>
  );
}

export function PermissionsEditor({
  user,
  onSave,
  onCancel,
}: {
  user: User;
  onSave: (userId: string, newPermissions: string[]) => void;
  onCancel: () => void;
}) {
  const allPermissions = Object.keys(permissionLabels) as Permission[];
  const [selected, setSelected] = useState<string[]>(user.permissions || []);

  useEffect(() => {
    setSelected(user.permissions || []);
  }, [user]);

  function toggle(p: string) {
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
