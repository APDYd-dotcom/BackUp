import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, createUser, deleteUser, updateUser, impersonateUser } from "../services/adminService";
import AdminUserForm from "../components/AdminUserForm";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { FaTimes, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

export default function AdminDashboard() {
  const { user, impersonate } = useContext(AuthContext);
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  const [updatePassModalVisible, setUpdatePassModalVisible] = useState(false);
  const [userToUpdate, setUserToUpdate] = useState(null);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [updatingPass, setUpdatingPass] = useState(false);
  const [modalError, setModalError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchUsers();
  }, [user]);

  const handleImpersonate = async (targetUser) => {
    try {
      const data = await impersonateUser(targetUser.id);
      impersonate(data.token, data.user);
      navigate("/dashboard");
    } catch(err) {
      toast.error("Failed to impersonate");
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (payload) => {
    const created = await createUser(payload);
    setUsers(prev => [created, ...prev]);
    setShowForm(false);
  };

  const handleDeleteClick = (u) => {
    setUserToDelete(u);
    setAdminPassword("");
    setModalError("");
    setDeleteModalVisible(true);
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    setModalError("");
    if (!adminPassword) return setModalError("Password is required");

    try {
      setDeleting(true);
      await deleteUser(userToDelete.id, adminPassword);
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      toast.success("User deleted successfully");
      setDeleteModalVisible(false);
      setUserToDelete(null);
    } catch (err) {
      setModalError(err?.response?.data?.message || "Verification failed. Incorrect password.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdatePasswordClick = (u) => {
    setUserToUpdate(u);
    setNewAdminPassword("");
    setModalError("");
    setUpdatePassModalVisible(true);
  };

  const confirmUpdatePassword = async (e) => {
    e.preventDefault();
    setModalError("");
    if (!newAdminPassword) return setModalError("New password is required");
    
    try {
      setUpdatingPass(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/admin/users/${userToUpdate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newAdminPassword })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update password");
      }
      toast.success("Password updated successfully!");
      fetchUsers();
      setUpdatePassModalVisible(false);
    } catch (err) {
      setModalError(err.message || "Failed to update password");
    } finally {
      setUpdatingPass(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage all users and their accounts</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-medium transition shadow-md"
            >
              <span className="text-lg">+</span>
              {showForm ? 'Cancel' : 'Create User'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Create Form Modal */}
        {showForm && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <AdminUserForm onCreate={handleCreate} onCancel={() => setShowForm(false)} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading clients...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="col-span-full flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg">No clients found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Create your first client to get started</p>
              </div>
            </div>
          ) : (
            users.map(u => (
              <div key={u.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                          : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{u.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{u.email}</p>
                  
                  {u.plain_password && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 border border-gray-100 dark:border-gray-600">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wider block">Admin Password</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePasswordVisibility(u.id); }}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title={visiblePasswords[u.id] ? "Hide password" : "Show password"}
                        >
                          {visiblePasswords[u.id] ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                        </button>
                      </div>
                      <code className={`text-sm font-mono block transition-all duration-300 ${!visiblePasswords[u.id] ? "blur-sm select-none text-gray-400" : "select-all text-gray-900 dark:text-gray-200"}`}>
                        {u.plain_password}
                      </code>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {u.role !== 'admin' ? (
                    <button
                      onClick={() => navigate(`/admin/client/${u.id}`)}
                      className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/40 dark:hover:to-blue-800/40 text-blue-700 dark:text-blue-400 py-2.5 rounded-xl transition font-medium text-sm"
                    >
                      Manage Accounts
                    </button>
                  ) : (
                    <>
                      {u.role === 'admin' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleImpersonate(u); }}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/50 py-2.5 rounded-xl transition font-medium text-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          Login as Admin
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdatePasswordClick(u); }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 hover:dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl transition font-medium text-sm"
                      >
                        Update Pwd
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(u); }}
                    className="p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition"
                    title="Delete Client"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DELETE MODAL */}
      {deleteModalVisible && userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-100 dark:border-red-800/30 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Confirm Deletion</h2>
              <button onClick={() => setDeleteModalVisible(false)}>
                <FaTimes className="text-red-400 hover:text-red-600 transition" />
              </button>
            </div>

            <form onSubmit={confirmDelete} className="p-6 space-y-4">
              {modalError && (
                <div className="mb-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {modalError}
                </div>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to delete <span className="font-semibold">{userToDelete.name}</span>? This action requires your password.
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
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition font-medium"
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteModalVisible(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 py-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium text-gray-800 dark:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE PASSWORD MODAL */}
      {updatePassModalVisible && userToUpdate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 border-b border-indigo-100 dark:border-indigo-800/30 flex justify-between items-center">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <FaLock className="text-lg" />
                <h2 className="text-lg font-semibold">Update Password</h2>
              </div>
              <button onClick={() => setUpdatePassModalVisible(false)}>
                <FaTimes className="text-indigo-400 hover:text-indigo-600 transition" />
              </button>
            </div>

            <form onSubmit={confirmUpdatePassword} className="p-6 space-y-4">
              {modalError && (
                <div className="mb-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {modalError}
                </div>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Set a new password for Admin: <span className="font-semibold text-gray-800 dark:text-white">{userToUpdate.name}</span>
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="Enter new strong password"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={updatingPass}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl transition font-medium"
                >
                  {updatingPass ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setUpdatePassModalVisible(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 py-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium text-gray-800 dark:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
