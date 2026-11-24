import { useState } from "react";
import { FaEye, FaCopy, FaTrash, FaEdit, FaTimes } from "react-icons/fa";
import axios from "axios";
import { useToast } from "../context/ToastContext";

export default function AccountCard({ account, onDelete, onUpdate }) {
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const [form, setForm] = useState({
    platform: account.platform,
    username: account.username,
    password: account.password,
    client_name: account.client_name || "",
    backup_codes: account.backup_codes || "",
  });

  if (!account) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(account.password);
    toast.success("Password copied!");
  };

  const handleDelete = () => {
    setModalError("");
    setAdminPassword("");
    setDeleting(true);
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    setModalError("");
    const token = localStorage.getItem("token");
    if (!token) return toast.error("You must be logged in");
    if (!adminPassword) return setModalError("Password is required");

    try {
      setLoading(true);
      await axios.delete(`/api/accounts/${account.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: adminPassword }
      });
      toast.success("Account deleted");
      if (onDelete) onDelete(account.id); 
      setDeleting(false);
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdate = async (e) => {
    e.preventDefault();
    setModalError("");
    try {
      setLoading(true);
  
      // Get token from localStorage
      const token = localStorage.getItem("token");
      if (!token) return toast.error("You must be logged in");
  
      // Send PUT request with token and data
      const res = await axios.put(
        `/api/accounts/${account.id}`,
        {
          platform: form.platform,
          username: form.username,
          password: form.password,
          notes: form.notes || "", // Include notes if needed
          client_name: form.client_name,
          backup_codes: form.backup_codes,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      console.log("Update response:", res.data); // Debug
      if (onUpdate) onUpdate(res.data);
      toast.success("Account updated");
      setEditing(false);
    } catch (err) {
      setModalError(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };
  
  
  

  return (
    <>
      {/* CARD */}
      <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <h3 className="min-w-0 break-words text-xl font-semibold text-gray-800 dark:text-white">
              {account.platform}
            </h3>
            {account.client_name && (
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300">
                {account.client_name}
              </span>
            )}
          </div>
          <p className="break-all text-sm text-gray-500 dark:text-gray-400">
            {account.username}
          </p>

          {account.backup_codes && (
            <div className="mt-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Backup Codes</span>
              <p className={`font-mono text-xs p-2 rounded-lg bg-gray-100 dark:bg-gray-700 whitespace-pre-wrap ${!showPassword && "blur-sm select-none"}`}>
                {account.backup_codes}
              </p>
            </div>
          )}

          <p
            className={`break-all font-mono text-sm mt-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700
            ${!showPassword && "blur-sm select-none"}`}
          >
            {account.password}
          </p>
        </div>

        <div className="flex justify-between items-center mt-5">
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="text-xs px-4 py-2 rounded-full bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white transition"
          >
            <FaEye />
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-full bg-green-600/10 text-green-600 hover:bg-green-600 hover:text-white transition"
            >
              <FaCopy />
            </button>

            <button
              onClick={() => setEditing(true)}
              className="p-2 rounded-full bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500 hover:text-white transition"
            >
              <FaEdit />
            </button>

            <button
              onClick={handleDelete}
              className="p-2 rounded-full bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white transition"
            >
              <FaTrash />
            </button>
          </div>
        </div>
      </div>

      {/* UPDATE MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold">Update Account</h2>
              <button onClick={() => setEditing(false)}>
                <FaTimes className="text-gray-500 hover:text-red-500 transition" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {modalError && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {modalError}
                </div>
              )}
              {["platform", "username", "password"].map((field) => (
                <input
                  key={field}
                  value={form[field]}
                  onChange={(e) =>
                    setForm({ ...form, [field]: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={field}
                  required
                />
              ))}

              <input
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Client Name"
              />
              
              <textarea
                value={form.backup_codes}
                onChange={(e) => setForm({ ...form, backup_codes: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                placeholder="Backup Codes"
                rows="3"
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition"
                >
                  {loading ? "Saving..." : "Update"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-100 dark:border-red-800/30 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Confirm Deletion</h2>
              <button onClick={() => setDeleting(false)}>
                <FaTimes className="text-red-400 hover:text-red-600 transition" />
              </button>
            </div>

            <form onSubmit={confirmDelete} className="p-6 space-y-4">
              {modalError && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {modalError}
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to delete the account for <span className="font-semibold">{account.platform}</span>? This action requires your admin password.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition font-medium"
                >
                  {loading ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 py-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium text-gray-800 dark:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
