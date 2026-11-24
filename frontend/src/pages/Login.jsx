import { useState } from "react";
import { login } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiShield, FiArrowRight, FiEye, FiEyeOff, FiCheck } from "react-icons/fi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-[#0f172a] px-0 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid min-h-screen max-w-6xl overflow-hidden bg-[#111827] shadow-[0_24px_80px_-24px_rgba(30,64,175,0.38)] sm:min-h-[calc(100vh-3rem)] sm:rounded-[2rem] lg:grid-cols-[1fr_0.86fr]">
        <section className="relative hidden min-h-[620px] overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.24),transparent_32%),radial-gradient(circle_at_85%_75%,rgba(168,85,247,0.22),transparent_28%)]"></div>
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              <FiShield className="text-2xl text-white" />
            </div>
            <span className="text-xl font-bold text-white">Vault</span>
          </div>

          <div className="relative max-w-md">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-[0_16px_40px_rgba(79,70,229,0.45)]">
              <FiLock className="text-2xl text-white" />
            </div>
            <h2 className="text-5xl font-bold leading-[1.08] tracking-tight text-white">
              Your credentials,
              <span className="block text-blue-300">protected.</span>
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-blue-100/75">
              Access your secure vault from anywhere. Accounts, passwords, and backup codes stay organized in one place.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm font-medium text-blue-100/90">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20">
                <FiCheck className="text-emerald-300" />
              </span>
              End-to-end protected access
            </div>
          </div>

          <p className="relative text-xs font-medium tracking-[0.18em] text-blue-200/50 uppercase">
            Secure account management
          </p>
        </section>

        <section className="flex min-h-[620px] items-center justify-center px-5 py-10 sm:px-10 lg:px-14 bg-[#111827]">
          <div className="w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-indigo-600/20">
                <FiShield className="text-2xl text-white" />
              </div>
              <span className="text-lg font-bold text-white">Vault</span>
            </div>

            <div className="mb-8">
              <p className="mb-2 text-sm font-bold text-indigo-400">WELCOME BACK</p>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Sign in to your account
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Enter your credentials to access your vault.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-300">
                  Email address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-700/80 text-slate-200">
                    <FiMail className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="auth-input h-12 rounded-xl border-slate-700 bg-slate-800/70 pl-14 pr-4 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:bg-slate-800 focus:ring-indigo-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-700/80 text-slate-200">
                    <FiLock className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="auth-input h-12 rounded-xl border-slate-700 bg-slate-800/70 pl-14 pr-12 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:bg-slate-800 focus:ring-indigo-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:from-indigo-600 hover:to-purple-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <FiArrowRight />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400">
              Need access?{" "}
              <Link to="/register" className="font-bold text-indigo-600 hover:text-purple-600">
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
