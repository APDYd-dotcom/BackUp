import { useState } from "react";
import { addAccount } from "../services/api";

export default function AddAccount() {
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addAccount({ platform, username, password });
    alert("Account added!");
    setPlatform("");
    setUsername("");
    setPassword("");
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Add Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
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
