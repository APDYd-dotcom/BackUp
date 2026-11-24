import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AddAccount from "./pages/AddAcount";
import AdminDashboard from "./pages/AdminDashboard";
import ClientAccountView from "./pages/ClientAccountView";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { useContext } from "react";
import Settings from "./pages/Settings";
import SecurityAdmin from "./pages/SecurityAdmin";

function ImpersonationBanner() {
  const { isImpersonating, stopImpersonating, user } = useContext(AuthContext);
  if (!isImpersonating) return null;
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-2 sm:px-6 sm:py-3 flex flex-col items-start gap-2 text-xs sm:text-sm font-medium shadow-lg border-b border-indigo-800 sm:flex-row sm:justify-between sm:items-center">
      <span className="flex min-w-0 items-center gap-2">
        <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
        <span>You are currently viewing as <strong className="break-words">{user?.name}</strong></span>
      </span>
      <button onClick={stopImpersonating} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition border border-white/10 backdrop-blur-sm shadow-sm flex items-center gap-2 text-left">
        <span>Return to Super Admin</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
      </button>
    </div>
  );
}

function AppChrome() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <>
      {!isAuthPage && <ImpersonationBanner />}
      {!isAuthPage && <Navbar />}
      <Routes>
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/add" element={<PrivateRoute><AddAccount /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/security" element={<AdminRoute><SecurityAdmin /></AdminRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/client/:id" element={<AdminRoute><ClientAccountView /></AdminRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter basename="/vault">
          <AppChrome />
        </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  );
}
