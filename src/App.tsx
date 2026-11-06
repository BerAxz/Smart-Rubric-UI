import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute, PublicOnlyRoute } from "./components/RouteGuards";
import { AuthPage, ForgotPasswordPage, ResetPasswordPage } from "./pages/AuthPage";
import { LandingPage } from "./pages/LandingPage";
import { ThemeProvider } from "./theme/ThemeContext";

const ChatPage = lazy(() => import("./pages/ChatPage").then((page) => ({ default: page.ChatPage })));
const ChatsPage = lazy(() => import("./pages/ChatsPage").then((page) => ({ default: page.ChatsPage })));
const CourseCreatePage = lazy(() => import("./pages/CourseCreatePage").then((page) => ({ default: page.CourseCreatePage })));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage").then((page) => ({ default: page.CourseDetailPage })));
const CoursesPage = lazy(() => import("./pages/CoursesPage").then((page) => ({ default: page.CoursesPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((page) => ({ default: page.DashboardPage })));
const EvaluationsPage = lazy(() => import("./pages/EvaluationsPage").then((page) => ({ default: page.EvaluationsPage })));
const EvaluationCreatePage = lazy(() => import("./pages/EvaluationCreatePage").then((page) => ({ default: page.EvaluationCreatePage })));
const EvaluationDetailPage = lazy(() => import("./pages/EvaluationDetailPage").then((page) => ({ default: page.EvaluationDetailPage })));
const AccountPage = lazy(() => import("./pages/AccountPage").then((page) => ({ default: page.AccountPage })));

function ProtectedLayout() {
  return <AppShell><Outlet /></AppShell>;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<div className="state state--full-page" role="status">Cargando…</div>}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<ProtectedLayout />}>
                  <Route path="/app" element={<DashboardPage />} />
                  <Route path="/app/courses" element={<CoursesPage />} />
                  <Route path="/app/chats" element={<ChatsPage />} />
                  <Route path="/app/account" element={<AccountPage />} />
                  <Route path="/app/settings" element={<AccountPage />} />
                  <Route path="/app/evaluations" element={<EvaluationsPage />} />
                  <Route path="/app/courses/new" element={<CourseCreatePage />} />
                  <Route path="/app/courses/:courseId" element={<CourseDetailPage />} />
                  <Route path="/app/courses/:courseId/evaluations/new" element={<EvaluationCreatePage />} />
                  <Route path="/app/evaluations/:evaluationId" element={<EvaluationDetailPage />} />
                  <Route path="/app/evaluations/:evaluationId/chat" element={<ChatPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
