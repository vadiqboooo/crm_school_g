import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ExamsPage from "./pages/ExamsPage";
import ExamRegisterPage from "./pages/ExamRegisterPage";
import ResultsPage from "./pages/ResultsPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";

function isAuthenticated() {
  return !!localStorage.getItem("s_access_token");
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

function AnimatedRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/exams" element={<ProtectedRoute><ExamsPage /></ProtectedRoute>} />
      <Route path="/exams/register" element={<ProtectedRoute><ExamRegisterPage /></ProtectedRoute>} />
      <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
