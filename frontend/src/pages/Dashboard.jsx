import { useEffect, useState } from "react";
import { getAccounts } from "../services/api";
import AccountCard from "../components/AccountCard";

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);

  // Remove deleted account from UI
  const deleteCard = (id) => {
    setAccounts((prevAccounts) =>
      prevAccounts.filter((acc) => acc.id !== id)
    );
  };
  // Update account set
  const updateCard = (updated) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === updated.id ? updated : acc))
    );
  };
  

  useEffect(() => {
    getAccounts().then(setAccounts);
  }, []);

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        My Accounts
      </h2>

      {accounts.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300">
          No accounts saved yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onDelete={updateCard}
              // onUpdate = {deleteCard}
            />
          ))}
        </div>
      )}
    </div>
  );
}
