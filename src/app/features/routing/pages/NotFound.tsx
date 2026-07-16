import { Link } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Home } from "lucide-react";
import { useAuth, getHomePathByRole } from "@/app/features/auth/AuthContext";

export function NotFound() {
  const { user } = useAuth();
  const homePath = getHomePathByRole(user?.role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">الصفحة غير موجودة</p>
        <Button asChild>
          <Link to={homePath}>
            <Home className="w-4 h-4 ml-2" />
            العودة للرئيسية
          </Link>
        </Button>
      </div>
    </div>
  );
}