import { useState } from "react";
import { login } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiShield, FiArrowRight } from "react-icons/fi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      // data contains { token, user: { id, name, email, role } }
      authLogin(data.token, data.user);
      navigate(data.user.role === 'admin' || data.user.role === 'superadmin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 animate-gradient-slow p-4 sm:p-6">
      {/* Decorative Circles */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass rounded-[2rem] p-5 premium-shadow sm:rounded-[2.5rem] sm:p-10">
          <div className="flex flex-col items-center mb-8 sm:mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
              <FiShield className="text-white text-4xl" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight text-center sm:text-4xl">
              Vault <span className="text-blue-600 dark:text-blue-400">Pro</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-3 text-lg font-medium">Secure access to your data</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-center gap-3 animate-shake">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Email Address</label>
              <div className="relative group">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="pl-12 bg-white/50 dark:bg-gray-900/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Password</label>
              <div className="relative group">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="pl-12 bg-white/50 dark:bg-gray-900/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <span className="relative flex items-center justify-center gap-2 text-lg font-bold">
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700/50 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              Don't have an account?{" "}
              <Link to="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Contact Admin
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
