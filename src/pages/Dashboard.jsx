import { useEffect, useState } from "react";
import { getAccounts } from "../services/api";
import AccountCard from "../components/AccountCard";
import AddAccountForm from "../components/AddAccountForm";

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch accounts from backend
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
      setError("Failed to load accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Remove account from state after deletion
  const handleDelete = (id) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  // Add new account to state
  const handleAddAccount = (newAccount) => {
    setAccounts((prev) => [...prev, newAccount]);
    setShowAddForm(false);
  };

  // Update account in state
  const handleUpdateAccount = (updatedAccount) => {
    setAccounts((prev) =>
      prev.map((acc) => 
        acc.id === updatedAccount.id ? updatedAccount : acc
      )
    );
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          My Accounts
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200"
        >
          + Add New Account
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
          {error}
          <button 
            onClick={fetchAccounts}
            className="ml-4 text-sm underline hover:text-red-900 dark:hover:text-red-100"
          >
            Retry
          </button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-700 dark:text-gray-300 text-lg mb-4">
            No accounts saved yet. Add your first account!
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 text-lg"
          >
            + Add Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onDelete={handleDelete}
              onUpdate={handleUpdateAccount}
            />
          ))}
        </div>
      )}

      {showAddForm && (
        <AddAccountForm
          onClose={() => setShowAddForm(false)}
          onAdd={handleAddAccount}
        />
      )}
    </div>
  );
}