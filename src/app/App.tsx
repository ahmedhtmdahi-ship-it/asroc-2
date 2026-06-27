import { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./features/auth/AuthContext";
import { WorkflowProvider } from "./context/WorkflowContext";

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkflowProvider>
        <Suspense fallback={<PageLoader />}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster position="top-center" />
      </WorkflowProvider>
    </AuthProvider>
  );
}
