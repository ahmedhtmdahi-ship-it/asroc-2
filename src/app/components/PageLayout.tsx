import React, { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  User,
  LogOut,
  ChevronDown,
  ArrowRight,
  Shield,
  Stethoscope,
  Pill,
  Users,
  BarChart3,
  FileText,
  UserCheck,
  Calendar,
  Settings,
  Landmark,
  Store,
  Printer,
  Bell,
  Search,
  Menu,
  X,
  Home,
  ClipboardList,
  HeartPulse,
  Loader2,
} from "lucide-react";

import logo from "../../assets/logo.png";
import { useAuth, getHomePathByRole } from "@/app/features/auth/AuthContext";
import { useWorkflow } from "@/app/context/WorkflowContext";
import type { UserRole } from "@/app/types/user";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  backLink?: string;
}

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  {
    label: "الرئيسية",
    icon: Home,
    link: "/employee",
    roles: ["employee"],
  },
  {
    label: "طلب كشف طبي",
    icon: FileText,
    link: "/employee/requests",
    roles: ["employee"],
  },
  {
    label: "طلباتي",
    icon: ClipboardList,
    link: "/employee/my-requests",
    roles: ["employee"],
  },
  {
    label: "التاريخ الطبي",
    icon: HeartPulse,
    link: "/employee/history",
    roles: ["employee"],
  },
  {
    label: "الإشعارات",
    icon: Bell,
    link: "/employee/notifications",
    roles: ["employee"],
  },
  {
    label: "طلب كشف طبي",
    icon: FileText,
    link: "/request/new",
    roles: ["manager", "office_manager", "security", "doctor", "pharmacy", "medical_admin", "pension_admin", "super_admin"],
  },
  {
    label: "طلباتي الطبية",
    icon: ClipboardList,
    link: "/my-requests",
    roles: ["manager", "office_manager", "security", "doctor", "pharmacy", "medical_admin", "pension_admin", "super_admin"],
  },
  {
    label: "موافقات المدير",
    icon: UserCheck,
    link: "/manager/approvals",
    roles: ["manager", "office_manager"],
  },
  {
    label: "الأمن",
    icon: Shield,
    link: "/security",
    roles: ["security"],
  },
  {
    label: "الخروج والعودة",
    icon: Shield,
    link: "/security/checkinout",
    roles: ["security"],
  },
  {
    label: "الطبيب",
    icon: Stethoscope,
    link: "/doctor",
    roles: ["doctor"],
  },
  {
    label: "الصيدلية الداخلية",
    icon: Pill,
    link: "/pharmacy",
    roles: ["pharmacy"],
  },
  {
    label: "الإدارة الطبية",
    icon: Users,
    link: "/medical-admin",
    roles: ["medical_admin"],
  },
  {
    label: "العلاج الشهري",
    icon: Calendar,
    link: "/monthly-treatment",
    roles: ["medical_admin", "pension_admin"],
  },
  {
    label: "المعاشات",
    icon: Landmark,
    link: "/pension-admin",
    roles: ["pension_admin"],
  },
  {
    label: "الصيدلية الخارجية",
    icon: Store,
    link: "/pharmacy/external",
    roles: ["pension_admin", "pharmacy"],
  },
  {
    label: "لوحة التحكم",
    icon: BarChart3,
    link: "/dashboard",
    roles: ["super_admin"],
  },
  {
    label: "إدارة النظام",
    icon: Settings,
    link: "/super-admin",
    roles: ["super_admin"],
  },
  {
    label: "التقارير",
    icon: BarChart3,
    link: "/reports",
    roles: ["medical_admin", "super_admin"],
  },
  {
    label: "المطبوعات",
    icon: Printer,
    link: "/print",
    roles: ["medical_admin", "super_admin"],
  },
];

function getRoleLabel(role?: UserRole) {
  switch (role) {
    case "employee":
      return "موظف";
    case "manager":
      return "مدير إدارة";
    case "office_manager":
      return "مدير مكتب";
    case "security":
      return "الأمن";
    case "doctor":
      return "طبيب";
    case "pharmacy":
      return "صيدلية";
    case "medical_admin":
      return "إدارة طبية";
    case "pension_admin":
      return "إدارة معاشات";
    case "super_admin":
      return "مدير النظام";
    default:
      return "مستخدم";
  }
}

export function PageLayout({
  children,
  title,
  subtitle,
  icon,
  backLink,
}: PageLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { syncing } = useWorkflow();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const visibleNavItems = user
    ? navItems.filter((item) => item.roles.includes(user.role))
    : [];

  const homePath = getHomePathByRole(user?.role);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // If backLink is "/dashboard", replace with the user's actual home path
  const resolvedBackLink =
    backLink === "/dashboard" ? homePath : backLink;

  const sidebarContent = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5">
          <img src={logo} alt="ASORC Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="text-lg font-extrabold tracking-wide">ASORC</p>
          <p className="text-xs text-white/60">الخدمات الطبية</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map((item) => {
          const active =
            location.pathname === item.link ||
            (item.link !== "/dashboard" &&
              item.link !== "/employee" &&
              item.link !== "/security" &&
              item.link !== "/doctor" &&
              item.link !== "/pharmacy" &&
              item.link !== "/medical-admin" &&
              item.link !== "/pension-admin" &&
              item.link !== "/manager/approvals" &&
              location.pathname.startsWith(item.link + "/"));

          return (
            <Link
              key={item.link}
              to={item.link}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                active
                  ? "bg-[#14B8A6] text-white shadow-lg shadow-teal-900/20"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs text-white/50">المستخدم الحالي</p>
          <p className="mt-1 text-sm font-bold">{user?.name || "غير مسجل"}</p>
          <p className="text-xs text-teal-300">{getRoleLabel(user?.role)}</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FB]" dir="rtl">
      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute right-0 top-0 flex h-screen w-72 flex-col bg-[#0B1F3A] text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute left-3 top-3 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed right-0 top-0 z-40 hidden h-screen w-72 flex-col border-l border-white/10 bg-[#0B1F3A] text-white xl:flex">
        {sidebarContent}
      </aside>

      <div className="xl:mr-72">
        <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {resolvedBackLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(resolvedBackLink)}
                  className="ml-1"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1F3A] text-white">
                {icon || <BarChart3 className="h-5 w-5" />}
              </div>

              <div>
                <h1 className="text-xl font-extrabold text-slate-900">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="hidden w-full max-w-sm items-center rounded-xl border bg-slate-50 px-3 py-2 md:flex">
              <Search className="ml-2 h-4 w-4 text-slate-400" />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="بحث سريع داخل النظام..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden text-xs sm:inline">
                      {user?.name || "مستخدم"}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p>{user?.name || "مستخدم"}</p>
                      <p className="text-xs font-normal text-slate-500">
                        {getRoleLabel(user?.role)}
                      </p>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link
                      to="/profile"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      <span>الملف الشخصي</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex cursor-pointer items-center gap-2 text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {syncing && (
          <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-6 py-2 text-xs text-blue-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            جاري مزامنة البيانات…
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}