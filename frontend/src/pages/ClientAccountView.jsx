import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getUserAccounts, createAccountForUser, getUsers } from "../services/adminService";
import AccountCard from "../components/AccountCard";
import { useToast } from "../context/ToastContext";

export default function ClientAccountView() {
  const { id } = useParams();
  const toast = useToast();
  const [client, setClient] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const users = await getUsers();
      const foundClient = users.find(u => u.id === parseInt(id));
      if (foundClient) setClient(foundClient);

      const data = await getUserAccounts(id);
      setAccounts(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load client data");
    } finally {
      setLoading(false);
    }
  };

  const deleteCard = (accountId) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
  };

  const updateCard = (updated) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === updated.id ? updated : acc))
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 px-4 py-6 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/30 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <header className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link to="/admin" className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white/80 px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-950/50 dark:text-indigo-300 dark:hover:bg-slate-800">
                ← User management
              </Link>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Client vault</p>
              <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {client ? `${client.name}'s accounts` : "Client accounts"}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Add and manage credentials for this client.
              </p>
            </div>
            {!loading && (
              <div className="flex w-fit items-center gap-3 rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-lg font-bold text-indigo-600 dark:text-indigo-300">
                  {accounts.length}
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">Accounts</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">Saved for this client</span>
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.8fr)] xl:gap-8">
          {/* Add Account Panel */}
          <div className="min-w-0 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">New credential</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Add new account</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Save an account to this client’s vault.</p>
              </div>
              <AccountCreator
                userId={id}
                onCreated={(acc) => setAccounts(prev => [acc, ...prev])}
              />
            </div>
          </div>

          {/* Accounts Grid */}
          <section aria-label="Client accounts" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved accounts</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Credentials and account details</p>
              </div>
            </div>
            {loading ? (
              <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" aria-label="Loading accounts"></div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                  <svg className="h-8 w-8 text-indigo-500 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">No accounts yet</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use the form to add this client’s first account.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5">
                {accounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    onDelete={deleteCard}
                    onUpdate={updateCard}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function AccountCreator({ userId, onCreated }) {
  const toast = useToast();
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clientName, setClientName] = useState("");
  const [backupCodes, setBackupCodes] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        platform,
        username,
        password,
        client_name: clientName,
        backup_codes: backupCodes,
        notes
      };
      const acc = await createAccountForUser(userId, payload);
      setPlatform(""); setUsername(""); setPassword("");
      setClientName(""); setBackupCodes(""); setNotes("");
      if (acc.notification && !acc.notification.emailSent) {
        toast.error(`Account created, but the Super Admin email was not sent (${acc.notification.emailsSent}/${acc.notification.recipients}). Check the backend SMTP settings and logs.`);
      } else {
        toast.success(acc.notification ? "Account created and Super Admin notified!" : "Account created successfully");
      }
      onCreated && onCreated(acc);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}
      <input
        value={platform} onChange={e=>setPlatform(e.target.value)}
        placeholder="Platform (e.g. Gmail)" required
        aria-label="Platform"
        className="w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition"
      />
      <input
        value={username} onChange={e=>setUsername(e.target.value)}
        placeholder="Username/Email" required
        aria-label="Username or email"
        className="w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition"
      />
      <input
        value={password} onChange={e=>setPassword(e.target.value)}
        type="password"
        placeholder="Password" required
        aria-label="Account password"
        className="w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition"
      />
      <input
        value={clientName} onChange={e=>setClientName(e.target.value)}
        placeholder="Client Name (e.g. Acme)"
        aria-label="Client name"
        className="w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition"
      />
      <textarea
        value={backupCodes} onChange={e=>setBackupCodes(e.target.value)}
        placeholder="Paste Backup Codes..." rows="4"
        aria-label="Backup codes"
        className="w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition"
      />
      <textarea
        value={notes} onChange={e=>setNotes(e.target.value)}
        placeholder="Additional Notes" rows="2"
        aria-label="Additional notes"
        className="w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition"
      />
      <button
        type="submit" disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create Account"}
      </button>
    </form>
  );
}
