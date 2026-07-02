import { Navigate, useLocation } from "react-router";
import { useAuth, getHomePathByRole } from "@/app/features/auth/AuthContext";
import type { UserRole } from "@/app/types/user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

const CHANGE_PASSWORD_PATH = "/change-password";

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // إجبار تغيير الباسورد أول دخول قبل استخدام أي صفحة (مع تجنّب حلقة إعادة التوجيه).
  if (user.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  if (roles && user.role !== "super_admin" && !roles.includes(user.role)) {
    // Redirect to the user's own home page instead of hardcoded /dashboard
    return <Navigate to={getHomePathByRole(user.role)} replace />;
  }

  return <>{children}</>;
}
