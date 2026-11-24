import { useEffect, useState } from "react";
import {
  decideLoginApproval,
  getAuditLog,
  getNotifications,
  getPendingLoginApprovals,
  markNotificationRead,
} from "../services/securityService";

export default function SecurityAdmin() {
  const [approvals, setApprovals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [audit, setAudit] = useState([]);
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const [pending, alerts, logs] = await Promise.all([
      getPendingLoginApprovals(),
      getNotifications(),
      getAuditLog(action ? { action } : {}),
    ]);
    setApprovals(pending);
    setNotifications(alerts);
    setAudit(logs);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      getPendingLoginApprovals(),
      getNotifications(),
      getAuditLog(action ? { action } : {}),
    ]).then(([pending, alerts, logs]) => {
      if (!active) return;
      setApprovals(pending);
      setNotifications(alerts);
      setAudit(logs);
    }).catch(() => {
      if (active) setMessage("Could not load security data");
    });
    return () => {
      active = false;
    };
  }, [action]);

  const decide = async (approval, selectedNumber = null, deny = false) => {
    try {
      await decideLoginApproval(approval.id, { selectedNumber, deny });
      setMessage(deny ? "Login denied" : "Login approval recorded");
      await refresh();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not record decision");
    }
  };

  const readNotification = async (id) => {
    await markNotificationRead(id);
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
  };

  return (
    <main className="min-h-screen bg-[#0f172a] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-bold text-indigo-400">SUPER ADMIN SECURITY</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Login approvals and audit</h1>
        </header>

        {message && <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-200">{message}</div>}

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Pending login approvals</h2>
            {approvals.length === 0 ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-sm text-slate-400">No pending login requests.</div>
            ) : approvals.map((approval) => (
              <div key={approval.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">{approval.user_name}</h3>
                    <p className="text-sm text-slate-400">{approval.user_email}</p>
                    <p className="mt-1 text-xs text-slate-500">{approval.ip_address} · {approval.user_agent}</p>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">Pending</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {approval.numbers.map((number) => (
                    <button key={number} type="button" onClick={() => decide(approval, number)} className="h-16 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-2xl font-black text-indigo-200 hover:bg-indigo-500 hover:text-white">
                      {number}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => decide(approval, null, true)} className="mt-3 h-10 w-full rounded-xl border border-red-500/40 text-sm font-bold text-red-300 hover:bg-red-500/10">
                  Deny login
                </button>
              </div>
            ))}
          </div>

          <aside className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-bold text-white">Notifications</h2>
            <div className="mt-4 space-y-3">
              {notifications.length === 0 && <p className="text-sm text-slate-400">No notifications.</p>}
              {notifications.map((notification) => (
                <button key={notification.id} type="button" onClick={() => readNotification(notification.id)} className={`w-full rounded-xl border p-3 text-left ${notification.read_at ? "border-slate-800 bg-slate-950/30" : "border-indigo-500/30 bg-indigo-500/10"}`}>
                  <p className="text-sm font-bold text-white">{notification.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{notification.message}</p>
                </button>
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-bold text-white">Audit log</h2>
              <p className="text-sm text-slate-400">Append-only security events</p>
            </div>
            <div className="flex gap-2">
              <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter action" className="auth-input h-10 w-48" />
              <button type="button" onClick={() => refresh()} className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">Filter</button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Resource</th>
                  <th className="px-3 py-3">Result</th>
                  <th className="px-3 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-800 text-slate-300">
                    <td className="whitespace-nowrap px-3 py-3">{entry.created_at}</td>
                    <td className="px-3 py-3">{entry.user_name || "Unknown"}</td>
                    <td className="px-3 py-3 font-mono text-xs">{entry.action}</td>
                    <td className="px-3 py-3">{entry.resource_type || "-"}</td>
                    <td className="px-3 py-3">{entry.result}</td>
                    <td className="px-3 py-3">{entry.ip_address || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
