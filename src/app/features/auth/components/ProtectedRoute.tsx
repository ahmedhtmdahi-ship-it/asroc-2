import { Navigate } from "react-router";
import { useAuth, getHomePathByRole } from "@/app/features/auth/AuthContext";
import type { UserRole, Permission } from "@/app/types/user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permissions?: Permission[];
}

export function ProtectedRoute({ children, roles, permissions }: ProtectedRouteProps) {
  const { user, isAuthenticated, hasRole, hasPermission } = useAuth();

  // ١. غير مسجل دخول
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // ٢. تحقق الأدوار (super_admin يتجاوز)
  if (roles && user.role !== "super_admin" && !hasRole(roles)) {
    return <Navigate to={getHomePathByRole(user.role)} replace />;
  }

  // ٣. تحقق الصلاحيات (super_admin يتجاوز)
  if (permissions && user.role !== "super_admin" && !hasPermission(permissions)) {
    return <Navigate to={getHomePathByRole(user.role)} replace />;
  }

  return <>{children}</>;
}