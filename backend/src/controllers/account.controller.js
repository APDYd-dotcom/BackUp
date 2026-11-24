import { openDB } from "../config/db.js";
import bcrypt from "bcryptjs";
import { encrypt, decrypt } from "../utils/crypto.js";
import { notifySuperAdmins, writeAudit } from "../services/audit.service.js";

/**
 * POST /api/accounts
 * Create account (AUTH REQUIRED)
 */
export async function addAccount(req, res) {
  try {
    const { platform, username, password, notes, client_name, backup_codes } = req.body;
    const userId = req.userId; // from auth middleware
    const userRole = req.userRole; 

    // Allow any logged-in user to have personal accounts (admin, superadmin, or user)
    // if (userRole !== 'user') {
    //   return res.status(403).json({ message: "Only regular users can have personal accounts" });
    // }

    if (!platform || !username || !password) {
      return res.status(400).json({ message: "Platform, username, and password are required" });
    }

    const db = await openDB();

    const encPlatform = encrypt(platform);
    const encUsername = encrypt(username);
    const encPassword = encrypt(password);
    const encNotes = encrypt(notes || "");
    const encClientName = encrypt(client_name || "");
    const encBackupCodes = encrypt(backup_codes || "");

    const result = await db.run(
      `INSERT INTO accounts (platform, username, password, notes, client_name, backup_codes, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [encPlatform, encUsername, encPassword, encNotes, encClientName, encBackupCodes, userId]
    );

    const creator = await db.get("SELECT name, role FROM users WHERE id = ?", [userId]);
    await writeAudit({
      userId,
      action: "account.created",
      resourceType: "account",
      resourceId: result.lastID,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      result: "success",
    });
    let notification = null;
    notification = await notifySuperAdmins({
      title: "New account added",
      message: `${creator?.name || "A user"} added a new ${platform} account${client_name ? ` for ${client_name}` : ""}.`,
      type: "account_alert",
      resourceType: "account",
      resourceId: result.lastID,
      metadata: { createdBy: creator?.name || null },
    });

    res.status(201).json({
      id: result.lastID,
      platform,
      username,
      password,
      notes,
      client_name,
      backup_codes,
      notification: notification && {
        emailSent: notification.recipients > 0 && notification.emailsSent === notification.recipients,
        emailsSent: notification.emailsSent,
        recipients: notification.recipients,
      },
    });
  } catch (err) {
    console.error("Add account error:", err);
    res.status(500).json({ message: "Failed to add account" });
  }
}

/**
 * GET /api/accounts
 * Get accounts for logged-in user
 */
export async function getAccounts(req, res) {
  try {
    const db = await openDB();
    const userId = req.userId;
    const userRole = req.userRole;

    // Allow any logged-in user to see their personal accounts
    // if (userRole !== 'user') {
    //   return res.json([]);
    // }

    const accounts = await db.all(
      `SELECT id, platform, username, password, notes, client_name, backup_codes
       FROM accounts
       WHERE user_id = ?`,
      [userId]
    );

    const decryptedAccounts = accounts.map(acc => ({
      ...acc,
      platform: decrypt(acc.platform),
      username: decrypt(acc.username),
      password: decrypt(acc.password),
      notes: decrypt(acc.notes),
      client_name: decrypt(acc.client_name),
      backup_codes: decrypt(acc.backup_codes)
    }));

    res.json(decryptedAccounts);
  } catch (err) {
    console.error("Get accounts error:", err);
    res.status(500).json({ error: "Database error" });
  }
}

/**
 * DELETE /api/accounts/:id
 */
export async function deleteAccount(req, res) {
  try {
    const db = await openDB();
    const { id } = req.params;
    const userId = req.userId;
    const { password, approvalId } = req.body;

    const currentUser = await db.get("SELECT password, role FROM users WHERE id = ?", [userId]);
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    if (currentUser.role !== "superadmin") {
      if (!approvalId) {
        return res.status(428).json({
          message: "Protected action approval required",
          code: "ACTION_APPROVAL_REQUIRED",
        });
      }
      const approval = await db.get(
        "SELECT * FROM action_approvals WHERE id=? AND requester_id=? AND action='delete' AND resource_type='account' AND resource_id=? AND status='verified'",
        [approvalId, userId, id],
      );
      if (!approval) {
        return res.status(403).json({ message: "Valid action approval required" });
      }
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required to delete." });
    }

    const isValid = await bcrypt.compare(password, currentUser.password);
    if (!isValid) return res.status(401).json({ message: "Invalid password." });

    const existing = await db.get(
      `SELECT a.*, u.parent_id 
       FROM accounts a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.id = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ message: "Account not found" });
    }

    // currentUser is already fetched above with its role
    
    if (existing.user_id !== userId && existing.parent_id !== userId && currentUser.role !== 'superadmin') {
      return res.status(403).json({ message: "Unauthorized to delete this account" });
    }

    await db.run("DELETE FROM accounts WHERE id = ?", [id]);
    if (approvalId) {
      await db.run(
        "UPDATE action_approvals SET status='executed', executed_at=datetime('now') WHERE id=? AND status='verified'",
        [approvalId],
      );
    }
    await writeAudit({
      userId,
      action: "account.deleted",
      resourceType: "account",
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      result: "success",
      metadata: { approvalId: approvalId || null, directSuperAdmin: currentUser.role === "superadmin" },
    });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
}

/**
 * PUT /api/accounts/:id
 */
export async function updateAccount(req, res) {
  try {
    const db = await openDB();
    const { id } = req.params;
    const userId = req.userId;
    const { platform, username, password, notes, client_name, backup_codes, approvalId } = req.body;
    const currentUser = await db.get("SELECT role FROM users WHERE id = ?", [userId]);
    if (currentUser.role !== "superadmin") {
      const approval = await db.get(
        "SELECT * FROM action_approvals WHERE id=? AND requester_id=? AND action='update' AND resource_type='account' AND resource_id=? AND status='verified'",
        [approvalId, userId, id],
      );
      if (!approval) {
        return res.status(428).json({
          message: "Protected action approval required",
          code: "ACTION_APPROVAL_REQUIRED",
        });
      }
    }

    const existing = await db.get(
      `SELECT a.*, u.parent_id 
       FROM accounts a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.id = ?`,
      [id]
    );
    if (!existing) return res.status(404).json({ message: "Account not found" });

    if (existing.user_id !== userId && existing.parent_id !== userId && currentUser.role !== 'superadmin') {
      return res.status(403).json({ message: "Unauthorized to update this account" });
    }

    const encPlatform = platform !== undefined ? encrypt(platform) : existing.platform;
    const encUsername = username !== undefined ? encrypt(username) : existing.username;
    const encPassword = password !== undefined ? encrypt(password) : existing.password;
    const encNotes = notes !== undefined ? encrypt(notes) : existing.notes;
    const encClientName = client_name !== undefined ? encrypt(client_name) : existing.client_name;
    const encBackupCodes = backup_codes !== undefined ? encrypt(backup_codes) : existing.backup_codes;

    await db.run(
      `UPDATE accounts SET
       platform = ?, 
       username = ?, 
       password = ?, 
       notes = ?,
       client_name = ?,
       backup_codes = ?
       WHERE id = ?`,
      [
        encPlatform,
        encUsername,
        encPassword,
        encNotes,
        encClientName,
        encBackupCodes,
        id
      ]
    );
    if (approvalId) {
      await db.run(
        "UPDATE action_approvals SET status='executed', executed_at=datetime('now') WHERE id=? AND status='verified'",
        [approvalId],
      );
    }

    const updatedRaw = await db.get(
      "SELECT * FROM accounts WHERE id = ?",
      [id]
    );

    const updated = {
      ...updatedRaw,
      platform: decrypt(updatedRaw.platform),
      username: decrypt(updatedRaw.username),
      password: decrypt(updatedRaw.password),
      notes: decrypt(updatedRaw.notes),
      client_name: decrypt(updatedRaw.client_name),
      backup_codes: decrypt(updatedRaw.backup_codes)
    };
    await writeAudit({
      userId,
      action: "account.updated",
      resourceType: "account",
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      result: "success",
      metadata: { approvalId: approvalId || null, directSuperAdmin: currentUser.role === "superadmin" },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
}
