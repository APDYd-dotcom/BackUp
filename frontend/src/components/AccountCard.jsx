import { useState } from "react";
import { FaEye, FaCopy, FaTrash, FaEdit, FaTimes } from "react-icons/fa";
import axios from "axios";

export default function AccountCard({ account, onDelete, onUpdate }) {
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    platform: account.platform,
    username: account.username,
    password: account.password,
  });

  if (!account) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(account.password);
    alert("Password copied!");
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this account?")) return;
    await axios.delete(`http://localhost:5000/api/accounts/${account.id}`);
    if (onDelete) onDelete(account.id); 
  };
  
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
  
      // Get token from localStorage
      const token = localStorage.getItem("token");
      if (!token) return alert("You must be logged in");
  
      // Send PATCH request with token and data
      const res = await axios.patch(
        `http://localhost:5000/api/accounts/${account.id}`,
        {
          platform: form.platform,
          username: form.username,
          password: form.password,
          notes: form.notes || "", // Include notes if needed
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
      setEditing(false);
    } catch (err) {
      console.error("Update error:", err.response || err); // More info
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };
  
  
  

  return (
    <>
      {/* CARD */}
      <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            {account.platform}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {account.username}
          </p>

          <p
            className={`font-mono text-sm mt-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 
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
    </>
  );
}