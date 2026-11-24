import { useEffect, useState } from "react";
import { getAccounts } from "../services/api";
import AccountCard from "../components/AccountCard";

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Remove deleted account from UI
  const deleteCard = (id) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  // Update account in UIr
  const updateCard = (updated) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === updated.id ? updated : acc))
    );
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await getAccounts();
        setAccounts(data);
        setError("");
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
        setError("Could not load your vault. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 px-4 py-6 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/30 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <header className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Personal vault</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Vault overview
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Your secured accounts, credentials, backup codes, and notes in one place.
              </p>
            </div>
            {!loading && !error && (
              <div className="flex w-fit items-center gap-3 rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-lg font-bold text-indigo-600 dark:text-indigo-300" aria-hidden="true">
                  {accounts.length}
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">Saved accounts</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">In your vault</span>
                </span>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/80 py-12 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="font-medium text-slate-500 dark:text-slate-400">Loading your secure vault...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-white">Your vault could not be loaded</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Refresh the page to try again.</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 sm:h-20 sm:w-20">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Your vault is empty</h3>
            <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              Contact your administrator to add your social media accounts and backup codes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 xl:gap-8">
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
      </div>
    </main>
  );
}
