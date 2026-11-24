import { createElement, useCallback, useEffect, useState } from "react";
import {
  FaBell,
  FaCheckCircle,
  FaClock,
  FaHistory,
  FaShieldAlt,
  FaSyncAlt,
} from "react-icons/fa";
import {
  decideLoginApproval,
  getAuditLog,
  getNotifications,
  getPendingLoginApprovals,
  markNotificationRead,
} from "../services/securityService";

function formatDate(value) {
  if (!value) return "Unknown time";
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function SummaryCard({ icon, label, value, accent }) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/10 sm:p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        {createElement(icon, { className: "text-lg", "aria-hidden": true })}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-white">{value}</p>
        <p className="mt-1.5 truncate text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export default function SecurityAdmin() {
  const [approvals, setApprovals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [audit, setAudit] = useState([]);
  const [filterInput, setFilterInput] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [decidingId, setDecidingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [pending, alerts, logs] = await Promise.all([
        getPendingLoginApprovals(),
        getNotifications(),
        getAuditLog(actionFilter ? { action: actionFilter } : {}),
      ]);
      setApprovals(pending);
      setNotifications(alerts);
      setAudit(logs);
    } catch {
      setError("Could not load security data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setActionFilter(filterInput.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [filterInput]);

  const decide = async (approval, selectedNumber = null, deny = false) => {
    setDecidingId(approval.id);
    setError("");
    setMessage("");
    try {
      await decideLoginApproval(approval.id, { selectedNumber, deny });
      setMessage(deny ? "Login request denied." : "Login decision recorded.");
      await loadData(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not record this decision.");
    } finally {
      setDecidingId(null);
    }
  };

  const readNotification = async (notification) => {
    if (notification.read_at) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not update notification.");
    }
  };

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <header className="overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-5 shadow-2xl shadow-indigo-950/20 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/20">
                <FaShieldAlt className="text-xl" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Super Admin</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Security center</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Review login requests, keep up with security alerts, and inspect recent activity.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 text-sm font-semibold text-slate-200 transition hover:border-indigo-400/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        )}

        <section aria-label="Security overview" className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <SummaryCard
            icon={FaClock}
            label="Pending login requests"
            value={loading ? "—" : approvals.length}
            accent="bg-amber-400/10 text-amber-300"
          />
          <SummaryCard
            icon={FaBell}
            label="Unread notifications"
            value={loading ? "—" : unreadCount}
            accent="bg-indigo-400/10 text-indigo-300"
          />
          <SummaryCard
            icon={FaHistory}
            label="Activity records"
            value={loading ? "—" : audit.length}
            accent="bg-cyan-400/10 text-cyan-300"
          />
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-white">Login approvals</h2>
                <p className="mt-1 text-sm text-slate-400">Choose the number shown on the requester’s screen.</p>
              </div>
              {!loading && approvals.length > 0 && (
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
                  {approvals.length} waiting
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 text-sm text-slate-400">
                Loading login requests...
              </div>
            ) : approvals.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-10 text-center">
                <FaCheckCircle className="mx-auto text-3xl text-emerald-400" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-white">You’re all caught up</h3>
                <p className="mt-1 text-sm text-slate-400">There are no pending login requests.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {approvals.map((approval) => (
                  <article key={approval.id} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/10 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-white">{approval.user_name || "Unknown user"}</h3>
                        <p className="mt-0.5 break-all text-sm text-slate-400">{approval.user_email}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-200">
                        Pending
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-2 rounded-xl bg-slate-950/60 p-3 text-xs sm:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="text-slate-500">Requested</dt>
                        <dd className="mt-1 break-words text-slate-300">{formatDate(approval.created_at)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-slate-500">IP address</dt>
                        <dd className="mt-1 break-all font-mono text-slate-300">{approval.ip_address || "Not available"}</dd>
                      </div>
                      <div className="min-w-0 sm:col-span-2">
                        <dt className="text-slate-500">Device / browser</dt>
                        <dd className="mt-1 break-words leading-5 text-slate-300">{approval.user_agent || "Not available"}</dd>
                      </div>
                    </dl>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Select the matching number
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(approval.numbers || []).map((number) => (
                        <button
                          key={number}
                          type="button"
                          disabled={decidingId !== null}
                          onClick={() => decide(approval, number)}
                          aria-label={`Approve login using number ${number}`}
                          className="min-h-14 rounded-xl border border-indigo-400/25 bg-indigo-500/10 text-2xl font-black text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={decidingId !== null}
                      onClick={() => decide(approval, null, true)}
                      className="mt-3 min-h-10 w-full rounded-xl border border-rose-400/20 bg-rose-500/5 text-sm font-semibold text-rose-300 transition hover:border-rose-400/40 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {decidingId === approval.id ? "Recording decision..." : "Deny login"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-slate-950/10">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-5">
              <div>
                <h2 className="font-bold text-white">Notifications</h2>
                <p className="mt-0.5 text-xs text-slate-400">Security and account alerts</p>
              </div>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-400/10 px-2.5 py-1 text-xs font-bold text-indigo-200">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="max-h-[34rem] space-y-2 overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <p className="px-2 py-6 text-center text-sm text-slate-400">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-slate-400">No notifications yet.</p>
              ) : notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => readNotification(notification)}
                  aria-label={`${notification.read_at ? "Read" : "Mark as read"}: ${notification.title}`}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    notification.read_at
                      ? "border-slate-800 bg-slate-950/30 hover:bg-slate-950/60"
                      : "border-indigo-400/20 bg-indigo-500/[0.07] hover:bg-indigo-500/[0.12]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-semibold leading-5 text-slate-100">{notification.title}</p>
                    {!notification.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-300" />}
                  </div>
                  <p className="mt-1.5 break-words text-xs leading-5 text-slate-400">{notification.message}</p>
                  <p className="mt-2 text-[11px] text-slate-500">{formatDate(notification.created_at)}</p>
                </button>
              ))}
            </div>
          </aside>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-slate-950/10">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <h2 className="font-bold text-white">Audit log</h2>
              <p className="mt-1 text-sm text-slate-400">Append-only record of security-related activity</p>
            </div>
            <div className="w-full sm:w-auto">
              <label className="sr-only" htmlFor="audit-action-filter">Filter audit actions</label>
              <input
                id="audit-action-filter"
                value={filterInput}
                onChange={(event) => setFilterInput(event.target.value)}
                placeholder="Search actions..."
                className="auth-input min-h-10 w-full sm:w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Time</th>
                  <th scope="col" className="px-4 py-3 font-semibold">User</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Resource</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Result</th>
                  <th scope="col" className="px-4 py-3 font-semibold">IP address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400">Loading activity...</td></tr>
                ) : audit.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400">No matching activity records.</td></tr>
                ) : audit.map((entry) => (
                  <tr key={entry.id} className="text-slate-300 transition hover:bg-slate-800/30">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{formatDate(entry.created_at)}</td>
                    <td className="max-w-48 truncate px-4 py-3">{entry.user_name || "Unknown"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-200">{entry.action}</td>
                    <td className="px-4 py-3">{entry.resource_type || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{entry.result}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{entry.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500 sm:px-5">
            Showing up to {audit.length} recent event{audit.length === 1 ? "" : "s"}.
          </p>
        </section>
      </div>
    </main>
  );
}
