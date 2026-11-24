import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { openDB } from "../config/db.js";
import "../config/env.js";
import { decrypt } from "../utils/crypto.js";
import {
  hashSecret,
  randomDigits,
  secureEqual,
  verifyTotp,
} from "../utils/security.js";
import { writeAudit, notifySuperAdmins } from "../services/audit.service.js";
import { sendMail } from "../services/mail.service.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});

function requestContext(req) {
  return {
    ipAddress: req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || null,
    userAgent: req.get("user-agent") || null,
  };
}

function issueLoginToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function makeChallengeToken(userId) {
  return jwt.sign(
    { id: userId, purpose: "2fa-login" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" },
  );
}

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
};

router.post("/register", async (req, res) => {
  return res.status(403).json({
    message: "Registration disabled. Contact your administrator to create users.",
  });
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const context = requestContext(req);
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const db = await openDB();
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      await writeAudit({
        action: "login.failure",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { email },
        result: "failure",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.locked_until && new Date(`${user.locked_until}Z`).getTime() > Date.now()) {
      await writeAudit({
        userId: user.id,
        action: "login.locked",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        result: "blocked",
      });
      return res.status(423).json({ message: "Account temporarily locked" });
    }

    const validPassword = await bcrypt.compare(password, user.password || "");
    if (!validPassword) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockedUntil = attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString().replace("T", " ").replace("Z", "")
        : null;
      await db.run(
        "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
        [attempts, lockedUntil, user.id],
      );
      await writeAudit({
        userId: user.id,
        action: "login.failure",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { attempts },
        result: "failure",
      });
      return res.status(lockedUntil ? 423 : 401).json({
        message: lockedUntil ? "Account temporarily locked" : "Invalid credentials",
      });
    }

    await db.run(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
      [user.id],
    );
    await writeAudit({
      userId: user.id,
      action: "login.password_verified",
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      result: "success",
    });

    const settings = await db.get(
      "SELECT * FROM two_factor_settings WHERE user_id = ?",
      [user.id],
    );
    if (!settings?.email_enabled && !settings?.totp_enabled) {
      return res.status(428).json({
        requires2fa: true,
        setupRequired: true,
        message: "Two-factor setup is required",
        code: "2FA_SETUP_REQUIRED",
        challengeToken: makeChallengeToken(user.id),
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    return res.json({
      requires2fa: true,
      emailEnabled: Boolean(settings.email_enabled),
      totpEnabled: Boolean(settings.totp_enabled),
      challengeToken: makeChallengeToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
});

router.post("/login/2fa", loginLimiter, async (req, res) => {
  try {
    const { challengeToken, emailCode, totpCode, backupCode } = req.body;
    const context = requestContext(req);
    let payload;
    try {
      payload = jwt.verify(challengeToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Login challenge expired" });
    }
    if (payload.purpose !== "2fa-login") {
      return res.status(401).json({ message: "Invalid login challenge" });
    }

    const db = await openDB();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [payload.id]);
    if (!user) return res.status(404).json({ message: "User not found" });
    const settings = await db.get(
      "SELECT * FROM two_factor_settings WHERE user_id = ?",
      [payload.id],
    );
    if (!settings?.email_enabled && !settings?.totp_enabled) {
      return res.status(428).json({ message: "Two-factor setup is required" });
    }

    let verified = false;
    if (settings.email_enabled && emailCode) {
      const otp = await db.get(
        `SELECT * FROM email_otps
         WHERE user_id=? AND purpose='login' AND used_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [payload.id],
      );
      if (otp &&
        otp.attempts < 5 &&
        new Date(`${otp.expires_at}Z`).getTime() > Date.now()) {
        if (secureEqual(hashSecret(emailCode), otp.code_hash)) {
          await db.run("UPDATE email_otps SET used_at=datetime('now') WHERE id=?", [otp.id]);
          verified = true;
        } else {
          await db.run("UPDATE email_otps SET attempts=attempts+1 WHERE id=?", [otp.id]);
        }
      }
    }

    if (!verified && settings.totp_enabled && totpCode) {
      verified = verifyTotp(decrypt(settings.totp_secret_encrypted), totpCode);
    }

    if (!verified && settings.totp_enabled && backupCode) {
      const rows = await db.all(
        "SELECT id, code_hash FROM backup_codes WHERE user_id=? AND used_at IS NULL",
        [payload.id],
      );
      for (const row of rows) {
        if (secureEqual(hashSecret(String(backupCode).replace(/\s/g, "").toUpperCase()), row.code_hash)) {
          await db.run("UPDATE backup_codes SET used_at=datetime('now') WHERE id=?", [row.id]);
          verified = true;
          break;
        }
      }
    }

    if (!verified) {
      await writeAudit({
        userId: payload.id,
        action: "2fa.failure",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        result: "failure",
      });
      return res.status(400).json({ message: "Invalid 2FA code" });
    }

    await writeAudit({
      userId: payload.id,
      action: "2fa.success",
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      result: "success",
    });

    if (user.role === "superadmin") {
      await writeAudit({
        userId: payload.id,
        action: "login.success",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        result: "success",
      });
      return res.json({
        approved: true,
        token: issueLoginToken(user),
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    const numbers = new Set();
    while (numbers.size < 3) {
      numbers.add(String(crypto.randomInt(10, 100)));
    }
    const numberList = [...numbers];
    const correctNumber = numberList[crypto.randomInt(0, numberList.length)];
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");
    const approvalToken = crypto.randomBytes(32).toString("hex");
    const result = await db.run(
      `INSERT INTO login_approval_requests
       (user_id, challenge_token_hash, correct_number, other_numbers, ip_address, user_agent, location, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id,
        hashSecret(approvalToken),
        correctNumber,
        JSON.stringify(numberList),
        context.ipAddress,
        context.userAgent,
        req.body.location || null,
        expiresAt,
      ],
    );

    await notifySuperAdmins({
      title: "Login approval required",
      message: `${user.name} (${user.email}) requested login approval.`,
      type: "login_approval",
      resourceType: "login_approval",
      resourceId: result.lastID,
      metadata: { ipAddress: context.ipAddress, userAgent: context.userAgent },
    });
    await writeAudit({
      userId: payload.id,
      action: "login.approval_requested",
      resourceType: "login_approval",
      resourceId: result.lastID,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      result: "pending",
    });

    return res.json({
      approvalId: result.lastID,
      approvalToken,
      userNumber: correctNumber,
      expiresInSeconds: 180,
    });
  } catch (error) {
    console.error("Login 2FA error:", error);
    return res.status(500).json({ message: "Login verification failed" });
  }
});

router.get("/login/approval/:id", loginLimiter, async (req, res) => {
  try {
    const { approvalToken } = req.query;
    const db = await openDB();
    const request = await db.get(
      "SELECT * FROM login_approval_requests WHERE id=?",
      [req.params.id],
    );
    if (!request) return res.status(404).json({ message: "Approval request not found" });
    if (!approvalToken ||
      !secureEqual(hashSecret(approvalToken), request.challenge_token_hash)) {
      return res.status(403).json({ message: "Invalid approval token" });
    }
    if (request.status === "pending" &&
      new Date(`${request.expires_at}Z`).getTime() <= Date.now()) {
      await db.run(
        "UPDATE login_approval_requests SET status='expired', decided_at=datetime('now') WHERE id=?",
        [request.id],
      );
      return res.json({ status: "expired" });
    }
    if (request.status === "approved") {
      const user = await db.get(
        "SELECT id,name,email,role FROM users WHERE id=?",
        [request.user_id],
      );
      return res.json({
        status: "approved",
        token: issueLoginToken(user),
        user,
      });
    }
    return res.json({ status: request.status });
  } catch (error) {
    console.error("Approval status error:", error);
    return res.status(500).json({ message: "Could not read approval status" });
  }
});

router.post("/login/approval/:id/decision", authenticateToken, loginLimiter, async (req, res) => {
  if (req.userRole !== "superadmin" && req.userRole !== "admin") {
    return res.status(403).json({ message: "Not authorized to approve login requests" });
  }
  const db = await openDB();
  const request = await db.get(
    "SELECT * FROM login_approval_requests WHERE id=?",
    [req.params.id],
  );
  if (!request) return res.status(404).json({ message: "Approval request not found" });
  if (request.status !== "pending") {
    return res.status(409).json({ message: `Approval request already ${request.status}` });
  }
  if (new Date(`${request.expires_at}Z`).getTime() <= Date.now()) {
    await db.run(
      "UPDATE login_approval_requests SET status='expired', decided_at=datetime('now') WHERE id=?",
      [request.id],
    );
    return res.status(410).json({ message: "Approval request expired" });
  }

  const { selectedNumber, deny } = req.body;
  const isCorrect = !deny && secureEqual(
    String(selectedNumber),
    String(request.correct_number),
  );
  const status = isCorrect ? "approved" : "denied";
  await db.run(
    `UPDATE login_approval_requests
     SET status=?, approved_by=?, selected_number=?, decided_at=datetime('now')
     WHERE id=? AND status='pending'`,
    [status, req.userId, deny ? null : String(selectedNumber), request.id],
  );
  await writeAudit({
    userId: request.user_id,
    action: "login.approval_decided",
    resourceType: "login_approval",
    resourceId: request.id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    metadata: { decision: status, approverId: req.userId, selectedNumber },
    result: status,
  });
  return res.json({ status });
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const db = await openDB();
    const user = await db.get(
      "SELECT id,name,email,role FROM users WHERE id=?",
      [req.userId],
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch {
    return res.status(500).json({ message: "Failed to fetch user" });
  }
});

export default router;
