import { Link, useLocation, useNavigate } from "react-router";
import { Bell, ClipboardList, LogOut, User } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/app/features/auth/AuthContext";
import { navConfig } from "@/app/layout/navConfig";
import type { UserRole } from "@/app/types/user";

const roleLabels: Record<UserRole, string> = {
  employee: "موظف",
  manager: "مدير إدارة",
  office_manager: "مدير مكتب",
  security: "أمن",
  doctor: "طبيب",
  pharmacy: "صيدلية",
  medical_admin: "إدارة طبية",
  pension_admin: "إدارة معاشات",
  super_admin: "مدير النظام",
};

/**
 * القالب الموحّد: سايدبار واحد لكل الأدوار — الزراير تتغير حسب navConfig.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = (user?.role ?? "employee") as UserRole;
  const items = navConfig[role] ?? navConfig.employee;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      {/* السايدبار الموحّد */}
      <aside className="fixed right-0 top-0 z-40 hidden h-screen w-72 flex-col bg-[#082344] text-white xl:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <img src={logo} className="h-14 w-14 object-contain" alt="ASORC" />
          <div>
            <p className="text-sm">نظام إدارة الخدمات الطبية</p>
            <h1 className="text-2xl font-bold">ASORC</h1>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
          {items.map(({ label, icon: Icon, to }) => {
            const active =
              location.pathname === to ||
              (to !== "/dashboard" && location.pathname.startsWith(to));
            return (
              <Link
                key={to + label}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  active ? "bg-teal-600" : "hover:bg-white/10"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mx-4 mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-right hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" />
          تسجيل الخروج
        </button>
      </aside>

      <main className="min-h-screen xl:mr-72">
        {/* الهيدر الموحّد */}
        <header className="flex min-h-20 items-center justify-between border-b bg-white px-5 xl:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <User className="h-7 w-7 text-slate-600" />
            </div>
            <div>
              <h2 className="font-bold">{user?.name || "مستخدم"}</h2>
              <p className="text-sm text-slate-500">
                {roleLabels[role]} • {user?.department || user?.financialNumber || "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <Link to="/employee/notifications" title="الإشعارات">
              <Bell className="h-5 w-5 transition-colors hover:text-slate-800" />
            </Link>
            <Link to="/my-requests" title="طلباتي">
              <ClipboardList className="h-5 w-5 transition-colors hover:text-slate-800" />
            </Link>
          </div>
        </header>

        {/* شريط تنقّل أفقي للموبايل */}
        <div className="flex gap-2 overflow-x-auto border-b bg-white px-4 py-2 xl:hidden">
          {items.map(({ label, to }) => (
            <Link
              key={"m" + to + label}
              to={to}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${
                location.pathname === to
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <section className="p-5 xl:p-8">{children}</section>
      </main>
    </div>
  );
}
