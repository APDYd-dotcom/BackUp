import axios from "axios";

const API = axios.create({ baseURL: "/api" });

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function authHeadersWithChallenge(challengeToken) {
  return challengeToken
    ? { "X-2FA-Challenge": challengeToken }
    : authHeaders();
}

export const get2faStatus = () => API.get("/2fa/status", { headers: authHeaders() }).then(r => r.data);
export const setupTotp = (challengeToken) => API.post("/2fa/totp/setup", {}, { headers: authHeadersWithChallenge(challengeToken) }).then(r => r.data);
export const verifyTotpSetup = (code, challengeToken) => API.post("/2fa/totp/verify", { code }, { headers: authHeadersWithChallenge(challengeToken) }).then(r => r.data);
export const sendEmailOtp = (purpose = "enable-email", challengeToken) => API.post("/2fa/email/send", { purpose }, { headers: authHeadersWithChallenge(challengeToken) }).then(r => r.data);
export const verifyEmailOtp = (code, purpose = "enable-email", challengeToken) => API.post("/2fa/email/verify", { code, purpose }, { headers: authHeadersWithChallenge(challengeToken) }).then(r => r.data);
export const disable2fa = (payload) => API.post("/2fa/disable", payload, { headers: authHeaders() }).then(r => r.data);
export const decideLoginApproval = (approvalId, payload) => API.post(`/auth/login/approval/${approvalId}/decision`, payload, { headers: authHeaders() }).then(r => r.data);
export const requestActionApproval = (payload) => API.post("/actions/request", payload, { headers: authHeaders() }).then(r => r.data);
export const verifyActionApproval = (approvalId, otp) => API.post(`/actions/${approvalId}/verify`, { otp }, { headers: authHeaders() }).then(r => r.data);

export const getPendingLoginApprovals = () => API.get("/admin/login-approvals/pending", { headers: authHeaders() }).then(r => r.data);
export const getNotifications = () => API.get("/admin/notifications", { headers: authHeaders() }).then(r => r.data);
export const markNotificationRead = (id) => API.post(`/admin/notifications/${id}/read`, {}, { headers: authHeaders() }).then(r => r.data);
export const getAuditLog = (params = {}) => API.get("/admin/audit", { headers: authHeaders(), params }).then(r => r.data);
