import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute, PublicOnlyRoute } from "./components/RouteGuards";
import { AuthPage, ForgotPasswordPage, ResetPasswordPage } from "./pages/AuthPage";
import { ChatPage } from "./pages/ChatPage";
import { CourseCreatePage } from "./pages/CourseCreatePage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EvaluationsPage } from "./pages/EvaluationsPage";
import { EvaluationCreatePage } from "./pages/EvaluationCreatePage";
import { EvaluationDetailPage } from "./pages/EvaluationDetailPage";
import { AccountPage } from "./pages/AccountPage";
import { LandingPage } from "./pages/LandingPage";

function ProtectedLayout() {
  return <AppShell><Outlet /></AppShell>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes><Route path="/" element={<LandingPage />} /><Route element={<PublicOnlyRoute />}><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} /></Route><Route element={<ProtectedRoute />}><Route element={<ProtectedLayout />}><Route path="/app" element={<DashboardPage />} /><Route path="/app/account" element={<AccountPage />} /><Route path="/app/evaluations" element={<EvaluationsPage />} /><Route path="/app/courses/new" element={<CourseCreatePage />} /><Route path="/app/courses/:courseId" element={<CourseDetailPage />} /><Route path="/app/courses/:courseId/evaluations/new" element={<EvaluationCreatePage />} /><Route path="/app/evaluations/:evaluationId" element={<EvaluationDetailPage />} /><Route path="/app/evaluations/:evaluationId/chat" element={<ChatPage />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></AuthProvider></BrowserRouter>;
}
