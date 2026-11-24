import { useState } from "react";
import { addAccount } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function AddAccount() {
  const toast = useToast();
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clientName, setClientName] = useState("");
  const [backupCodes, setBackupCodes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await addAccount({
        platform, 
        username, 
        password,
        client_name: clientName,
        backup_codes: backupCodes,
        notes
      });
      if (result.notification && !result.notification.emailSent) {
        toast.error(`Account added, but the Super Admin email was not sent (${result.notification.emailsSent}/${result.notification.recipients}). Check the backend SMTP settings and logs.`);
      } else {
        toast.success(result.notification ? "Account added and Super Admin notified!" : "Account added!");
      }
      setPlatform("");
      setUsername("");
      setPassword("");
      setClientName("");
      setBackupCodes("");
      setNotes("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 px-4 py-6 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/30 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <header className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Vault management</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Add an account</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Store credentials securely and keep related backup codes and notes together.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.7fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6 border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">Account details</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fields marked required must be filled in.</p>
            </div>
            {error && (
              <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Platform <span className="text-rose-500">*</span>
                  <input
                    type="text"
                    placeholder="e.g. Gmail"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="mt-2"
                    required
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Username or email <span className="text-rose-500">*</span>
                  <input
                    type="text"
                    placeholder="name@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-2"
                    required
                  />
                </label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password <span className="text-rose-500">*</span>
                  <input
                    type="password"
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2"
                    required
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Client name <span className="font-normal text-slate-400">(optional)</span>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-2"
                  />
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Backup codes <span className="font-normal text-slate-400">(optional)</span>
                <textarea
                  placeholder="Paste backup codes here"
                  value={backupCodes}
                  onChange={(e) => setBackupCodes(e.target.value)}
                  rows="3"
                  className="mt-2 font-mono text-sm"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Additional notes <span className="font-normal text-slate-400">(optional)</span>
                <textarea
                  placeholder="Add helpful details about this account"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="mt-2 text-sm"
                />
              </label>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPlatform("");
                    setUsername("");
                    setPassword("");
                    setClientName("");
                    setBackupCodes("");
                    setNotes("");
                    setError("");
                  }}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-11 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Saving account..." : "Save account"}
                </button>
              </div>
            </form>
          </section>

          <aside className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 dark:border-indigo-400/15 dark:bg-indigo-500/[0.06] sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="mt-4 font-bold text-slate-900 dark:text-white">Keep your vault organized</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Use a clear platform name and add a client label when it helps you find the account later.
            </p>
            <div className="mt-5 space-y-3 border-t border-indigo-100 pt-5 text-sm dark:border-slate-700">
              <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                Credentials are stored encrypted.
              </p>
              <p className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                Backup codes and notes stay attached to the account.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
