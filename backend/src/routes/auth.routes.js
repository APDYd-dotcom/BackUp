import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { openDB } from "../config/db.js";
import "../config/env.js";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
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

const loginChallengeLimiter = rateLimit({
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

// ✅ Middleware to verify JWT
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload contains { id, role }
    req.user = payload;
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

/**
 * POST /api/auth/register
 */
// Disable public registration: users are created by admin only
router.post("/register", async (req, res) => {
  return res.status(403).json({ message: "Registration disabled. Contact your administrator to create users." });
});

/**
 * POST /api/auth/login
 */
router.post("/login", loginChallengeLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const context = requestContext(req);

    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

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

      router.post("/login/2fa", loginChallengeLimiter, async (req, res) => {
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

          const settings = await db.get("SELECT * FROM two_factor_settings WHERE user_id = ?", [payload.id]);
          if (!settings) return res.status(400).json({ message: "2FA is not configured" });

          if (settings.email_enabled) {
            if (!emailCode) return res.status(400).json({ message: "Email code is required" });
            const otp = await db.get(
              `SELECT * FROM email_otps
               WHERE user_id = ? AND purpose = 'login' AND used_at IS NULL
               ORDER BY created_at DESC LIMIT 1`,
              [payload.id],
            );
            if (!otp || new Date(`${otp.expires_at}Z`).getTime() <= Date.now()) {
              await writeAudit({
                userId: payload.id,
                action: "2fa.email.failure",
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                result: "failure",
              });
              return res.status(400).json({ message: "Email code expired or unavailable" });
            }
            if (otp.attempts >= 5) {
              await db.run("UPDATE email_otps SET used_at = datetime('now') WHERE id = ?", [otp.id]);
              return res.status(400).json({ message: "Email code invalidated" });
            }
            if (!secureEqual(hashSecret(emailCode), otp.code_hash)) {
              await db.run("UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?", [otp.id]);
              await writeAudit({
                userId: payload.id,
                action: "2fa.email.failure",
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                result: "failure",
              });
              return res.status(400).json({ message: "Invalid email code" });
            }
            await db.run("UPDATE email_otps SET used_at = datetime('now') WHERE id = ?", [otp.id]);
          }

          if (settings.totp_enabled) {
            let verified = false;
            if (totpCode) {
              verified = verifyTotp(decrypt(settings.totp_secret_encrypted), totpCode);
            } else if (backupCode) {
              const backup = await db.get(
                "SELECT id, code_hash FROM backup_codes WHERE user_id = ? AND used_at IS NULL",
                [payload.id],
              );
              const rows = await db.all(
                "SELECT id, code_hash FROM backup_codes WHERE user_id = ? AND used_at IS NULL",
                [payload.id],
              );
              for (const row of rows) {
                if (secureEqual(hashSecret(String(backupCode).replace(/\s/g, "").toUpperCase()), row.code_hash)) {
                  await db.run("UPDATE backup_codes SET used_at = datetime('now') WHERE id = ?", [row.id]);
                  verified = true;
                  break;
                }
              }
            }
            if (!verified) {
              await writeAudit({
                userId: payload.id,
                action: "2fa.totp.failure",
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                result: "failure",
              });
              return res.status(400).json({ message: "Invalid authenticator or backup code" });
            }
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
            const token = issueLoginToken(user);
            return res.json({
              token,
              approved: true,
              user: { id: user.id, name: user.name, email: user.email, role: user.role },
            });
          }

          const numbers = new Set();
          while (numbers.size < 3) numbers.add(String(crypto.randomInt(10, 100)));
          const numberList = [...numbers];
          const correctIndex = crypto.randomInt(0, 3);
          const correctNumber = numberList[correctIndex];
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

          const approvalId = result.lastID;
          const admin = await db.get(
            "SELECT id, name, email FROM users WHERE id = ? OR (role = 'superadmin')",
            [user.parent_id],
          );
          const details = `${user.name} (${user.email}) from ${context.ipAddress || "unknown IP"} at ${new Date().toISOString()}`;

          await notifySuperAdmins({
            title: "Login approval required",
            message: `${details} selected login approval request ${approvalId}.`,
            type: "login_approval",
            resourceType: "login_approval",
            resourceId: approvalId,
            metadata: { approvalId, userAgent: context.userAgent, location: req.body.location },
          });
          if (admin && admin.role !== "superadmin") {
            await db.run(
              "INSERT INTO notifications (recipient_id, type, title, message, resource_type, resource_id) VALUES (?, ?, ?, ?, ?, ?)",
              [admin.id, "login_approval", "Login approval required", details, "login_approval", String(approvalId)],
            );
            void sendMail({
              to: admin.email,
              subject: "Login approval required",
              text: details,
            });
          }

          await writeAudit({
            userId: payload.id,
            action: "login.approval_requested",
            resourceType: "login_approval",
            resourceId: approvalId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            result: "pending",
          });

          res.json({
            approvalId,
            approvalToken,
            userNumber: correctNumber,
            expiresInSeconds: 180,
          });
        } catch (error) {
          console.error("Login 2FA error:", error);
          res.status(500).json({ message: "Login verification failed" });
        }
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
      return res.status(401).json({
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
    const requires2fa = Boolean(settings?.email_enabled || settings?.totp_enabled);

    if (!requires2fa) {
      await writeAudit({
        userId: user.id,
        action: "login.success",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        result: "success",
      });
      return res.json({
        requires2fa: false,
        requiresApproval: true,
        challengeToken: makeChallengeToken(user.id),
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    res.json({
      requires2fa: true,
      emailEnabled: Boolean(settings.email_enabled),
      totpEnabled: Boolean(settings.totp_enabled),
      challengeToken: makeChallengeToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

router.get("/login/approval/:id", loginChallengeLimiter, async (req, res) => {
  try {
    const { approvalToken } = req.query;
    const db = await openDB();
    const request = await db.get(
      "SELECT * FROM login_approval_requests WHERE id = ?",
      [req.params.id],
    );
    if (!request) return res.status(404).json({ message: "Approval request not found" });
    if (!approvalToken || !secureEqual(hashSecret(approvalToken), request.challenge_token_hash)) {
      return res.status(403).json({ message: "Invalid approval token" });
    }

    if (request.status === "pending" &&
      new Date(`${request.expires_at}Z`).getTime() <= Date.now()) {
      await db.run(
        "UPDATE login_approval_requests SET status = 'expired', decided_at = datetime('now') WHERE id = ? AND status = 'pending'",
        [request.id],
      );
      await writeAudit({
        userId: request.user_id,
        action: "login.approval_expired",
        resourceType: "login_approval",
        resourceId: request.id,
        result: "expired",
      });
      return res.json({ status: "expired" });
    }

    if (request.status === "approved") {
      const user = await db.get(
        "SELECT id, name, email, role FROM users WHERE id = ?",
        [request.user_id],
      );
      await writeAudit({
        userId: request.user_id,
        action: "login.success",
        resourceType: "login_approval",
        resourceId: request.id,
        ipAddress: request.ip_address,
        userAgent: request.user_agent,
        result: "success",
      });
      return res.json({
        status: "approved",
        token: issueLoginToken(user),
        user,
      });
    }

    res.json({ status: request.status });
  } catch (error) {
    console.error("Approval status error:", error);
    res.status(500).json({ message: "Could not read approval status" });
  }
});

router.post("/login/approval/:id/decision", authenticateToken, loginChallengeLimiter, async (req, res) => {
  try {
    if (req.userRole !== "superadmin" && req.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized to approve login requests" });
    }

    const { selectedNumber, deny } = req.body;
    const db = await openDB();
    const request = await db.get(
      "SELECT * FROM login_approval_requests WHERE id = ?",
      [req.params.id],
    );
    if (!request) return res.status(404).json({ message: "Approval request not found" });
    if (request.status !== "pending") {
      return res.status(409).json({ message: `Approval request already ${request.status}` });
    }
    if (new Date(`${request.expires_at}Z`).getTime() <= Date.now()) {
      await db.run(
        "UPDATE login_approval_requests SET status = 'expired', decided_at = datetime('now') WHERE id = ?",
        [request.id],
      );
      return res.status(410).json({ message: "Approval request expired" });
    }

    const isCorrectMatch = !deny && secureEqual(
      String(selectedNumber),
      String(request.correct_number),
    );
    const status = isCorrectMatch ? "approved" : "denied";

    await db.run(
      `UPDATE login_approval_requests
       SET status = ?, approved_by = ?, selected_number = ?, decided_at = datetime('now')
       WHERE id = ? AND status = 'pending'`,
      [status, req.userId, deny ? null : String(selectedNumber), request.id],
    );

    await writeAudit({
      userId: request.user_id,
      action: "login.approval_decided",
      resourceType: "login_approval",
      resourceId: request.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: {
        decision: status,
        selectedNumber: deny ? null : String(selectedNumber),
        approverId: req.userId,
      },
      result: status,
    });

    if (status === "denied") {
      await notifySuperAdmins({
        title: "Login approval denied",
        message: `A login approval request was denied or used the wrong number.`,
        type: "login_denied",
        resourceType: "login_approval",
        resourceId: request.id,
        metadata: { approverId: req.userId, selectedNumber },
      });
    }

    res.json({ status });
  } catch (error) {
    console.error("Approval decision error:", error);
    res.status(500).json({ message: "Could not record approval decision" });
  }
});

/**
 * GET /api/auth/me
 * Protected route
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const db = await openDB();
    const user = await db.get("SELECT id, name, email, role FROM users WHERE id = ?", [
      req.user.id,
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("Auth /me error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

export default router;
