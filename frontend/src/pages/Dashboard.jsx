import { useEffect, useState } from "react";
import { getAccounts } from "../services/api";
import AccountCard from "../components/AccountCard";

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 sm:mb-10">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-3xl">
            Vault Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Manage and access your secured account credentials.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Decrypting your vault...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 text-center border border-slate-200 dark:border-slate-700 shadow-sm sm:p-12">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Your Vault is Empty</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
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
    </div>
  );
}
