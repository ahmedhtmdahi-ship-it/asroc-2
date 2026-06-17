import { Link } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">الصفحة غير موجودة</p>
        <Button asChild>
          <Link to="/dashboard">
            <Home className="w-4 h-4 ml-2" />
            العودة للرئيسية
          </Link>
        </Button>
      </div>
    </div>
  );
}
