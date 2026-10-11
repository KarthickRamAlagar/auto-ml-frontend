import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { newChatPath } from "@/lib/ids";
import Landing from "@/pages/Landing";
import ForgotPassword from "@/pages/ForgotPassword";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Pricing from "@/pages/Pricing";
import ResetPassword from "@/pages/ResetPassword";
import SignUp from "@/pages/SignUp";
import VerifyEmail from "@/pages/VerifyEmail";

const Workspace = lazy(() => import("@/pages/Workspace"));
const ProjectPage = lazy(() => import("@/pages/ProjectPage"));
const Admin = lazy(() => import("@/pages/Admin"));
const Settings = lazy(() => import("@/pages/Settings"));
const Report = lazy(() => import("@/pages/Report"));
const ReportCombined = lazy(() => import("@/pages/ReportCombined"));

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

/** /auto-ml and the legacy /app both open a fresh chat with its own id in the URL. */
function NewChatRedirect() {
  return <Navigate to={newChatPath()} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center"><Spinner /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auto-ml" element={<Protected><NewChatRedirect /></Protected>} />
        <Route path="/auto-ml/chat/:chatId" element={<Protected><Workspace /></Protected>} />
        <Route path="/auto-ml/project/:projectId" element={<Protected><ProjectPage /></Protected>} />
        <Route path="/auto-ml/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/app" element={<Protected><NewChatRedirect /></Protected>} />
        <Route path="/admin" element={<Protected><Admin /></Protected>} />
        <Route path="/report/combined/:chatId" element={<Protected><ReportCombined /></Protected>} />
        <Route path="/report/:jobId" element={<Protected><Report /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
