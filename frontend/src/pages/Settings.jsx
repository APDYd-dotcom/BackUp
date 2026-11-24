import { useEffect, useState } from "react";
import {
  disable2fa,
  get2faStatus,
  setupTotp,
  verifyTotpSetup,
  sendEmailOtp,
  verifyEmailOtp,
} from "../services/securityService";

export default function Settings() {
  const [status, setStatus] = useState({ emailEnabled: false, totpEnabled: false });
  const [totpSetup, setTotpSetup] = useState(null);
  const [code, setCode] = useState("");
  const [emailMode, setEmailMode] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    get2faStatus().then(setStatus).catch(() => setError("Could not load security settings"));
  }, []);

  const startTotp = async () => {
    setError("");
    setLoading(true);
    try {
      setTotpSetup(await setupTotp());
    } catch (err) {
      setError(err.response?.data?.message || "Could not start setup");
    } finally {
      setLoading(false);
    }
  };

  const finishTotp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await verifyTotpSetup(code);
      setStatus((current) => ({ ...current, totpEnabled: true }));
      setTotpSetup({ ...totpSetup, backupCodes: data.backupCodes, verified: true });
      setCode("");
      setMessage("Authenticator app enabled");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const startEmail = async () => {
    setLoading(true);
    setError("");
    try {
      await sendEmailOtp("enable-email");
      setEmailMode(true);
      setMessage("Verification code sent");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send email code");
    } finally {
      setLoading(false);
    }
  };

  const finishEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await verifyEmailOtp(code, "enable-email");
      setStatus((current) => ({ ...current, emailEnabled: true }));
      setEmailMode(false);
      setCode("");
      setMessage("Email verification enabled");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email code");
    } finally {
      setLoading(false);
    }
  };

  const disable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await disable2fa({ password, totpCode: code });
      setStatus({ emailEnabled: false, totpEnabled: false });
      setPassword("");
      setCode("");
      setMessage("Two-factor authentication disabled");
    } catch (err) {
      setError(err.response?.data?.message || "Could not disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-sm font-bold text-indigo-400">ACCOUNT SECURITY</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Two-factor authentication</h1>
          <p className="mt-2 text-sm text-slate-400">Protect sign-in with email codes or an authenticator app.</p>
        </header>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">{message}</div>}

        <section className={`rounded-2xl border p-5 ${status.smtpConfigured ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
          <h2 className="font-bold text-white">Email delivery</h2>
          <p className={`mt-2 text-sm ${status.smtpConfigured ? "text-emerald-300" : "text-amber-200"}`}>
            {status.smtpConfigured
              ? `Email OTP is ready${status.smtpFrom ? ` from ${status.smtpFrom}` : ""}.`
              : "Email OTP is unavailable until SMTP host, username, and password are configured in backend/.env."}
          </p>
          {!status.smtpConfigured && (
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{`SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-sender@example.com
SMTP_PASS=your-app-password
SMTP_FROM=Vault Security <your-sender@example.com>`}</pre>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-bold text-white">Email verification</h2>
            <p className="mt-2 text-sm text-slate-400">Receive a six-digit code for sign-in challenges.</p>
            {status.emailEnabled ? (
              <div className="mt-5 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-300">Enabled</div>
            ) : (
              <button type="button" onClick={startEmail} disabled={loading} className="mt-5 h-10 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700">Enable email 2FA</button>
            )}
            {emailMode && (
              <form onSubmit={finishEmail} className="mt-4 space-y-3">
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit email code" className="auth-input h-12 text-center" />
                <button type="submit" className="h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white">Verify email code</button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-bold text-white">Authenticator app</h2>
            <p className="mt-2 text-sm text-slate-400">Use Google Authenticator or another TOTP app.</p>
            {status.totpEnabled ? (
              <div className="mt-5 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-300">Enabled</div>
            ) : (
              <button type="button" onClick={startTotp} disabled={loading} className="mt-5 h-10 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700">Set up authenticator</button>
            )}
          </div>
        </section>

        {totpSetup?.qrCodeDataUrl && (
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-bold text-white">Scan the QR code</h2>
            <img src={totpSetup.qrCodeDataUrl} alt="Authenticator QR code" className="mx-auto mt-4 max-w-xs rounded-xl bg-white p-4" />
            <p className="mt-3 break-all text-center text-xs text-slate-400">Manual key: {totpSetup.manualKey}</p>
            <form onSubmit={finishTotp} className="mx-auto mt-4 max-w-sm space-y-3">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit authenticator code" className="auth-input h-12 text-center" />
              <button type="submit" disabled={code.length !== 6} className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white">Verify and enable</button>
            </form>
          </section>
        )}

        {totpSetup?.backupCodes && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="font-bold text-amber-200">Save these backup codes now</h2>
            <p className="mt-1 text-sm text-amber-200/70">They are shown once and cannot be retrieved again.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {totpSetup.backupCodes.map((backupCode) => (
                <code key={backupCode} className="rounded-lg bg-slate-950 px-3 py-2 text-center text-sm text-white">{backupCode}</code>
              ))}
            </div>
          </section>
        )}

        {(status.emailEnabled || status.totpEnabled) && (
          <section className="rounded-2xl border border-red-500/20 bg-slate-900 p-5">
            <h2 className="font-bold text-white">Disable two-factor authentication</h2>
            <form onSubmit={disable} className="mt-4 grid gap-3 sm:grid-cols-3">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Account password" className="auth-input h-11" required />
              {status.totpEnabled && <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Authenticator code" className="auth-input h-11 text-center" />}
              <button type="submit" className="h-11 rounded-xl border border-red-500/40 text-sm font-bold text-red-300 hover:bg-red-500/10">Disable 2FA</button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
