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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link to="/admin" className="text-blue-600 hover:text-blue-800 transition font-medium text-xl shadow-sm bg-blue-50 py-1 px-3 rounded-lg dark:bg-gray-700 dark:text-blue-400">← Back</Link>
            <h1 className="min-w-0 break-words text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              {client ? `${client.name}'s Accounts` : "Client Accounts"}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Add Account Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:sticky lg:top-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">Add New Account</h3>
              <AccountCreator 
                userId={id} 
                onCreated={(acc) => setAccounts(prev => [acc, ...prev])} 
              />
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <p className="text-gray-900 dark:text-white text-lg font-medium">No accounts found</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Use the side panel to add their first social media account.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
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
      </div>
    </div>
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
      toast.success("Account created successfully");
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
        className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition" 
      />
      <input 
        value={username} onChange={e=>setUsername(e.target.value)} 
        placeholder="Username/Email" required 
        className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition" 
      />
      <input 
        value={password} onChange={e=>setPassword(e.target.value)} 
        type="password"
        placeholder="Password" required 
        className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition" 
      />
      <input 
        value={clientName} onChange={e=>setClientName(e.target.value)} 
        placeholder="Client Name (e.g. Acme)" 
        className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition" 
      />
      <textarea 
        value={backupCodes} onChange={e=>setBackupCodes(e.target.value)} 
        placeholder="Paste Backup Codes..." rows="4"
        className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none transition" 
      />
      <textarea 
        value={notes} onChange={e=>setNotes(e.target.value)} 
        placeholder="Additional Notes" rows="2"
        className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition" 
      />
      <button 
        type="submit" disabled={loading} 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition font-medium"
      >
        {loading ? "Creating..." : "Create Account"}
      </button>
    </form>
  );
}
