import { Navigate } from "react-router";
import { useAuth, getHomePathByRole } from "@/app/features/auth/AuthContext";
import type { UserRole } from "@/app/types/user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to the user's own home page instead of hardcoded /dashboard
    return <Navigate to={getHomePathByRole(user.role)} replace />;
  }

  return <>{children}</>;
}