import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  User,
} from "lucide-react";

import { useAuth, getRedirectPathByRole } from "@/app/features/auth/AuthContext";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

import logo from "@/assets/logo.png";
import loginBg from "@/assets/login-bg.png";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoginError("");
    setIsLoading(true);

    try {
      const user = await login(username, password);

      if (!user) {
        setLoginError("اسم المستخدم أو كلمة المرور غير صحيحة");
        return;
      }

      // الدخول بيودّي مباشرة للصفحة الرئيسية حسب الدور — تغيير الباسورد اختياري
      // من صفحة البروفايل (مش إجباري).
      navigate(getRedirectPathByRole(user.role));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#071B33]"
      style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(2, 12, 27, 0.10), rgba(2, 12, 27, 0.55)),
          url(${loginBg})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-l from-[#071B33]/10 via-transparent to-[#071B33]/20" />

      <section className="relative z-10 min-h-screen flex items-center justify-start px-6 sm:px-10 lg:px-24 xl:px-32">
        <div className="w-[480px] shrink-0 rounded-[32px] border border-white/70 bg-white/95 px-8 py-9 shadow-2xl backdrop-blur-md sm:px-10">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-36 w-36 items-center justify-center">
              <img
                src={logo}
                alt="ASORC Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <h1 className="text-5xl font-extrabold tracking-wide text-[#0B1F3A]">
              ASORC
            </h1>

            <h2 className="mt-2 text-2xl font-bold text-[#0B1F3A]">
              نظام إدارة الخدمات الطبية
            </h2>

            <p className="mt-2 text-sm font-semibold text-cyan-700">
              Internal Medical Services Workflow Management System
            </p>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="h-2 w-2 rounded-full bg-cyan-600" />
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-base font-bold text-slate-900"
              >
                اسم المستخدم
              </Label>

              <div className="relative">
                <User className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-700" />
                <Input
                  id="username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setLoginError("");
                  }}
                  required
                  className="h-14 rounded-xl border-slate-300 pr-12 text-right text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-base font-bold text-slate-900"
              >
                كلمة المرور
              </Label>

              <div className="relative">
                <LockKeyhole className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-700" />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-cyan-700"
                  aria-label={
                    showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>

                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError("");
                  }}
                  required
                  className="h-14 rounded-xl border-slate-300 pr-12 pl-12 text-right text-base"
                />
              </div>
            </div>

            {loginError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {loginError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-4 h-14 w-full rounded-xl bg-[#062B55] text-lg font-bold shadow-lg hover:bg-[#0B1F3A]"
            >
              <span>
                {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </span>

              <ArrowLeft className="mr-3 h-5 w-5" />
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-center">
            <p className="text-sm font-medium text-cyan-800">
              يرجى استخدام بيانات الدخول المعتمدة من إدارة النظام
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-600">
            <div className="h-px flex-1 bg-slate-200" />
            <ShieldCheck className="h-5 w-5 text-cyan-700" />
            <span>نظام داخلي - للاستخدام المؤسسي فقط</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>
      </section>

      <footer className="absolute bottom-8 left-0 right-0 z-10 text-center text-white/85">
        <p className="text-xl font-bold">شركة أسيوط لتكرير البترول</p>
        <p className="mt-1 font-semibold text-cyan-300">قطاع الخدمات الطبية</p>
        <p className="mt-1 text-sm text-white/70">
          ASORC Medical Services Department
        </p>
      </footer>
    </main>
  );
}