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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await addAccount({ 
        platform, 
        username, 
        password,
        client_name: clientName,
        backup_codes: backupCodes,
        notes
      });
      toast.success("Account added!");
      setPlatform("");
      setUsername("");
      setPassword("");
      setClientName("");
      setBackupCodes("");
      setNotes("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add account");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-bold mb-6 sm:text-3xl">Add Account</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
          required
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
          required
        />
        <input
          type="text"
          placeholder="Client Name (e.g. Acme Corp)"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700"
        />
        <textarea
          placeholder="Paste Backup Codes Here..."
          value={backupCodes}
          onChange={(e) => setBackupCodes(e.target.value)}
          rows="3"
          className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
        />
        <textarea
          placeholder="Additional Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="3"
          className="w-full p-2 rounded border border-gray-300 dark:bg-gray-800 dark:border-gray-700 text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Account
        </button>
      </form>
    </div>
  );
}
