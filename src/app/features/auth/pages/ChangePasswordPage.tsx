import { useState } from "react";
import { useNavigate } from "react-router";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useAuth, getHomePathByRole } from "@/app/features/auth/AuthContext";
import { ApiError } from "@/app/lib/apiClient";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }
    if (newPassword === currentPassword) {
      setError("كلمة المرور الجديدة يجب أن تختلف عن الحالية");
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("تم تغيير كلمة المرور بنجاح");
      navigate(getHomePathByRole(user?.role), { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "تعذر تغيير كلمة المرور، حاول مرة أخرى";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-slate-50 px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">تغيير كلمة المرور</h1>
          <p className="mt-1 text-sm text-slate-500">
            اختر كلمة مرور جديدة قوية.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            <LockKeyhole className="ml-2 h-4 w-4" />
            {isLoading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </Button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
          >
            تسجيل الخروج
          </button>
        </form>
      </div>
    </main>
  );
}
