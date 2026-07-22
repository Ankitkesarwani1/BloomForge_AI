import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layout/main-layout";
import { AuthLayout } from "./components/layout/auth-layout";
import { ProtectedRoute } from "./components/layout/protected-route";
import { LoginPage } from "./components/pages/login-page";
import { RegisterPage } from "./components/pages/register-page";
import { ForgotPasswordPage } from "./components/pages/forgot-password-page";
import { DashboardPage } from "./components/pages/dashboard-page";
import { SyllabusManagementPage } from "./components/pages/syllabus-management-page";
import { QuestionBankPage } from "./components/pages/question-bank-page";
import { AIQuestionGeneratorPage } from "./components/pages/ai-question-generator-page";
import { BloomAnalyticsPage } from "./components/pages/bloom-analytics-page";
import { CoverageAnalyzerPage } from "./components/pages/coverage-analyzer-page";
import { QuestionPaperBuilderPage } from "./components/pages/question-paper-builder-page";
import { AnswerKeyGeneratorPage } from "./components/pages/answer-key-generator-page";
import { AnalyticsDashboardPage } from "./components/pages/analytics-dashboard-page";
import { AdminPanelPage } from "./components/pages/admin-panel-page";
import { ProfileSettingsPage } from "./components/pages/profile-settings-page";
import { LandingPage } from "./components/pages/landing-page";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
    ],
  },
  {
    path: "/app",
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "syllabus", element: <SyllabusManagementPage /> },
          { path: "question-bank", element: <QuestionBankPage /> },
          { path: "ai-generator", element: <AIQuestionGeneratorPage /> },
          { path: "bloom-analytics", element: <BloomAnalyticsPage /> },
          { path: "coverage-analyzer", element: <CoverageAnalyzerPage /> },
          { path: "paper-builder", element: <QuestionPaperBuilderPage /> },
          { path: "answer-key", element: <AnswerKeyGeneratorPage /> },
          { path: "analytics", element: <AnalyticsDashboardPage /> },
          { path: "admin", element: <AdminPanelPage /> },
          { path: "settings", element: <ProfileSettingsPage /> },
        ],
      },
    ],
  },
]);
