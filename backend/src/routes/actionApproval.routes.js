import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middlewares/auth.middleware.js";
import { openDB } from "../config/db.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import { randomDigits, hashSecret, secureEqual } from "../utils/security.js";
import { sendMail } from "../services/mail.service.js";
import { writeAudit, notifySuperAdmins } from "../services/audit.service.js";

const router = express.Router();
router.use(authMiddleware);

const protectedResources = new Set(
  (process.env.PROTECTED_RESOURCES || "account,user")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many approval requests. Please try again later." },
});

function requestContext(req) {
  return {
    ipAddress: req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || null,
    userAgent: req.get("user-agent") || null,
  };
}

async function executeAccountAction({ action, resourceId, payload, requesterId }) {
  const db = await openDB();
  const record = await db.get(
    `SELECT a.*, u.parent_id
     FROM accounts a JOIN users u ON u.id = a.user_id
     WHERE a.id = ?`,
    [resourceId],
  );
  if (!record) return { status: 404, message: "Account not found" };

  const requester = await db.get("SELECT role, parent_id FROM users WHERE id = ?", [requesterId]);
  const ownsAccount = record.user_id === requesterId;
  const managesAccount = requester?.role === "admin" && record.parent_id === requesterId;
  if (!ownsAccount && !managesAccount && requester?.role !== "superadmin") {
    return { status: 403, message: "Not authorized to modify this account" };
  }

  if (action === "delete") {
    await db.run("DELETE FROM accounts WHERE id = ?", [resourceId]);
    return { status: 200, message: "Account deleted" };
  }

  const next = payload || {};
  const encPlatform = next.platform !== undefined ? encrypt(next.platform) : record.platform;
  const encUsername = next.username !== undefined ? encrypt(next.username) : record.username;
  const encPassword = next.password !== undefined ? encrypt(next.password) : record.password;
  const encNotes = next.notes !== undefined ? encrypt(next.notes) : record.notes;
  const encClientName = next.client_name !== undefined ? encrypt(next.client_name) : record.client_name;
  const encBackupCodes = next.backup_codes !== undefined ? encrypt(next.backup_codes) : record.backup_codes;

  await db.run(
    `UPDATE accounts SET platform=?, username=?, password=?, notes=?, client_name=?, backup_codes=? WHERE id=?`,
    [encPlatform, encUsername, encPassword, encNotes, encClientName, encBackupCodes, resourceId],
  );
  const updated = await db.get("SELECT * FROM accounts WHERE id = ?", [resourceId]);
  return {
    status: 200,
    message: "Account updated",
    account: {
      ...updated,
      platform: decrypt(updated.platform),
      username: decrypt(updated.username),
      password: decrypt(updated.password),
      notes: decrypt(updated.notes),
      client_name: decrypt(updated.client_name),
      backup_codes: decrypt(updated.backup_codes),
    },
  };
}

router.post("/request", actionLimiter, async (req, res) => {
  try {
    const { action, resourceType, resourceId, payload = {} } = req.body;
    if (!["update", "delete"].includes(action)) {
      return res.status(400).json({ message: "Unsupported action" });
    }
    if (!protectedResources.has(resourceType)) {
      return res.status(400).json({ message: "Resource type is not protected" });
    }
    if (!resourceId) return res.status(400).json({ message: "Resource id is required" });

    const db = await openDB();
    const requester = await db.get("SELECT id, name, email, role FROM users WHERE id = ?", [req.userId]);
    let resourceLabel = `${resourceType} ${resourceId}`;
    if (resourceType === "account") {
      const account = await db.get(
        "SELECT platform, username, client_name FROM accounts WHERE id = ?",
        [resourceId],
      );
      if (account) {
        const platform = decrypt(account.platform) || "Unknown platform";
        const username = decrypt(account.username) || "";
        const clientName = decrypt(account.client_name) || "";
        resourceLabel = [platform, username, clientName].filter(Boolean).join(" — ");
      }
    }

    if (requester.role === "superadmin") {
      const result = await executeAccountAction({
        action,
        resourceId,
        payload,
        requesterId: req.userId,
      });
      await writeAudit({
        userId: req.userId,
        action: `protected_action.${action}.executed`,
        resourceType,
        resourceId,
        ipAddress: requestContext(req).ipAddress,
        userAgent: requestContext(req).userAgent,
        metadata: { directSuperAdmin: true },
        result: "success",
      });
      return res.status(result.status).json(result);
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");
    const otp = randomDigits(6);

    const created = await db.run(
      `INSERT INTO action_approvals
       (requester_id, action, resource_type, resource_id, otp_hash, status, payload, expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        req.userId,
        action,
        resourceType,
        String(resourceId),
        hashSecret(otp),
        JSON.stringify(payload),
        expiresAt,
      ],
    );

    await writeAudit({
      userId: req.userId,
      action: "protected_action.requested",
      resourceType,
      resourceId,
      ipAddress: requestContext(req).ipAddress,
      userAgent: requestContext(req).userAgent,
      metadata: { approvalId: created.lastID, action },
      result: "pending",
    });

    const superAdmins = await db.all("SELECT id, name, email FROM users WHERE role = 'superadmin'");
    for (const superAdmin of superAdmins) {
      await db.run(
        "INSERT INTO notifications (recipient_id, type, title, message, resource_type, resource_id) VALUES (?, 'action_approval', ?, ?, ?, ?)",
        [
          superAdmin.id,
          "Protected action approval required",
          `${requester.name} requested ${action} for ${resourceLabel}.`,
          resourceType,
          String(resourceId),
        ],
      );
      void sendMail({
        to: superAdmin.email,
        subject: "Vault protected action approval OTP",
        text: `A Super Admin OTP request was created for ${requester.name}.\nAction: ${action}\nAccount: ${resourceLabel}\nAccount ID: ${resourceId}\nOTP: ${otp}\nExpires in 10 minutes.`,
      });
    }

    await writeAudit({
      userId: req.userId,
      action: "protected_action.otp_sent",
      resourceType,
      resourceId,
      ipAddress: requestContext(req).ipAddress,
      userAgent: requestContext(req).userAgent,
      metadata: { approvalId: created.lastID },
      result: "success",
    });

    res.status(202).json({
      approvalId: created.lastID,
      expiresInSeconds: 600,
      message: "Ask a Super Admin for the verification OTP",
    });
  } catch (error) {
    console.error("Action approval request error:", error);
    res.status(500).json({ message: "Could not request approval" });
  }
});

router.post("/:id/verify", actionLimiter, async (req, res) => {
  try {
    const { otp } = req.body;
    const db = await openDB();
    const approval = await db.get("SELECT * FROM action_approvals WHERE id = ?", [req.params.id]);
    if (!approval) return res.status(404).json({ message: "Approval request not found" });
    if (approval.requester_id !== req.userId) return res.status(403).json({ message: "Not authorized" });
    if (approval.status !== "pending") {
      return res.status(409).json({ message: `Approval request already ${approval.status}` });
    }
    if (new Date(`${approval.expires_at}Z`).getTime() <= Date.now()) {
      await db.run("UPDATE action_approvals SET status='expired', cancelled_at=datetime('now') WHERE id=?", [approval.id]);
      await writeAudit({
        userId: approval.requester_id,
        action: "protected_action.expired",
        resourceType: approval.resource_type,
        resourceId: approval.resource_id,
        result: "expired",
      });
      return res.status(410).json({ message: "Approval request expired" });
    }

    const candidateHash = hashSecret(String(otp || ""));
    if (!secureEqual(candidateHash, approval.otp_hash)) {
      const attempts = approval.otp_attempts + 1;
      if (attempts >= 3) {
        await db.run(
          "UPDATE action_approvals SET otp_attempts=?, status='cancelled', cancelled_at=datetime('now') WHERE id=?",
          [attempts, approval.id],
        );
        await writeAudit({
          userId: approval.requester_id,
          action: "protected_action.failed",
          resourceType: approval.resource_type,
          resourceId: approval.resource_id,
          result: "cancelled",
          metadata: { attempts, reason: "maximum_attempts" },
        });
        await notifySuperAdmins({
          title: "Protected action OTP cancelled",
          message: "An action approval OTP was cancelled after 3 failed attempts.",
          type: "security_alert",
          resourceType: approval.resource_type,
          resourceId: approval.resource_id,
          metadata: { approvalId: approval.id, attempts },
        });
        return res.status(423).json({ message: "Too many failed attempts. Request cancelled." });
      }
      await db.run("UPDATE action_approvals SET otp_attempts=? WHERE id=?", [attempts, approval.id]);
      await writeAudit({
        userId: approval.requester_id,
        action: "protected_action.otp_failed",
        resourceType: approval.resource_type,
        resourceId: approval.resource_id,
        metadata: { attempts },
        result: "failure",
      });
      return res.status(400).json({
        message: "Invalid OTP",
        attemptsRemaining: 3 - attempts,
      });
    }

    await db.run(
      "UPDATE action_approvals SET status='verified', otp_attempts=otp_attempts+1, verified_at=datetime('now') WHERE id=?",
      [approval.id],
    );
    await writeAudit({
      userId: approval.requester_id,
      action: "protected_action.otp_verified",
      resourceType: approval.resource_type,
      resourceId: approval.resource_id,
      metadata: { approvalId: approval.id },
      result: "success",
    });

    return res.status(200).json({
      status: "verified",
      approvalId: approval.id,
      action: approval.action,
      resourceType: approval.resource_type,
      resourceId: approval.resource_id,
      message: "OTP verified. Execute the protected action once.",
    });
  } catch (error) {
    console.error("Action approval verify error:", error);
    res.status(500).json({ message: "Could not verify protected action" });
  }
});

router.get("/pending", async (req, res) => {
  if (req.userRole !== "superadmin") {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  const db = await openDB();
  const pending = await db.all(
    `SELECT aa.*, u.name AS requester_name, u.email AS requester_email
     FROM action_approvals aa
     JOIN users u ON u.id = aa.requester_id
     WHERE aa.status='pending' AND aa.expires_at > datetime('now')
     ORDER BY aa.created_at DESC`,
  );
  res.json(pending);
});

export default router;
