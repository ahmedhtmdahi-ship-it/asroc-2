import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./features/auth/AuthContext";
import { WorkflowProvider } from "./context/WorkflowContext";

export default function App() {
  return (
    <AuthProvider>
      <WorkflowProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </WorkflowProvider>
    </AuthProvider>
  );
}
