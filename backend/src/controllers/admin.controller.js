import { openDB } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { encrypt, decrypt } from "../utils/crypto.js";
import { notifySuperAdmins, writeAudit } from "../services/audit.service.js";

export async function getUsers(req, res) {
  try {
    const db = await openDB();
    const currentUser = await db.get("SELECT role FROM users WHERE id = ?", [req.userId]);
    
    if (currentUser.role === 'superadmin') {
      const admins = await db.all("SELECT id, name, email, role, plain_password FROM users WHERE role = 'admin'");
      const decryptedAdmins = admins.map(a => ({ ...a, plain_password: decrypt(a.plain_password) }));
      return res.json(decryptedAdmins);
    } else if (currentUser.role === 'admin') {
      const users = await db.all("SELECT id, name, email, role FROM users WHERE parent_id = ? AND role = 'user'", [req.userId]);
      return res.json(users);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
}

export async function getUserAccounts(req, res) {
  try {
    const db = await openDB();
    const { id } = req.params;

    const currentUser = await db.get("SELECT role FROM users WHERE id = ?", [req.userId]);
    const targetUser = await db.get("SELECT id, role, parent_id FROM users WHERE id = ?", [id]);
    
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (currentUser.role === 'admin') {
      if (targetUser.parent_id !== req.userId) return res.status(403).json({ message: "Unauthorized" });
    } else if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ message: "Forbidden" });
    }

    const accounts = await db.all(
      `SELECT id, platform, username, password, notes, client_name, backup_codes
       FROM accounts
       WHERE user_id = ?`,
      [id]
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
    console.error("Get user accounts error:", err);
    res.status(500).json({ message: "Failed to fetch accounts" });
  }
}

export async function createUser(req, res) {
  try {
    const db = await openDB();
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Name and email required" });

    const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const currentUser = await db.get("SELECT role FROM users WHERE id = ?", [req.userId]);
    
    let role = 'user';
    let passToStore = '';
    let plainPassToStore = null;

    if (currentUser.role === 'superadmin') {
      role = req.body.role || 'admin'; // Allow superadmin to specify role
      if (!password) return res.status(400).json({ message: 'Password required' });
      passToStore = await bcrypt.hash(password, 10);
      plainPassToStore = password;
    } else if (currentUser.role === 'admin') {
      role = 'user';
      if (password) {
        passToStore = await bcrypt.hash(password, 10);
      }
    } else {
      return res.status(403).json({ message: "Not authorized to create users" });
    }

    const encryptedPlainPass = plainPassToStore ? encrypt(plainPassToStore) : null;
    const result = await db.run(
      "INSERT INTO users (name, email, password, plain_password, role, parent_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, passToStore, encryptedPlainPass, role, req.userId]
    );

    res.status(201).json({ id: result.lastID, name, email, role, plain_password: plainPassToStore });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
}

export async function createAccountForUser(req, res) {
  try {
    const db = await openDB();
    const { id } = req.params;
    const { platform, username, password, notes, client_name, backup_codes } = req.body;

    if (!platform || !username || !password) {
      return res.status(400).json({ message: 'platform, username and password are required' });
    }

    const currentUser = await db.get("SELECT role FROM users WHERE id = ?", [req.userId]);
    const targetUser = await db.get("SELECT id, role, parent_id FROM users WHERE id = ?", [id]);

    if (!targetUser) return res.status(404).json({ message: "Target user not found" });
    if (targetUser.role !== 'user') return res.status(400).json({ message: "Accounts can only be added to regular users" });

    if (currentUser.role === 'admin') {
      if (targetUser.parent_id !== req.userId) return res.status(403).json({ message: "Unauthorized" });
    } else if (currentUser.role !== 'superadmin') {
      return res.status(403).json({ message: "Forbidden" });
    }

    const encPlatform = encrypt(platform);
    const encUsername = encrypt(username);
    const encPassword = encrypt(password);
    const encNotes = encrypt(notes || '');
    const encClientName = encrypt(client_name || '');
    const encBackupCodes = encrypt(backup_codes || '');

    const result = await db.run(
      `INSERT INTO accounts (platform, username, password, notes, client_name, backup_codes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [encPlatform, encUsername, encPassword, encNotes, encClientName, encBackupCodes, id]
    );

    const creator = await db.get("SELECT name, role FROM users WHERE id = ?", [req.userId]);
    const accountOwner = await db.get("SELECT name FROM users WHERE id = ?", [id]);
    await writeAudit({
      userId: req.userId,
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
      message: `${creator?.name || "An administrator"} added a new ${platform} account for ${accountOwner?.name || "a user"}${client_name ? ` (${client_name})` : ""}.`,
      type: "account_alert",
      resourceType: "account",
      resourceId: result.lastID,
      metadata: { createdBy: creator?.name || null, accountOwner: accountOwner?.name || null },
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
    console.error('Create account for user error:', err);
    res.status(500).json({ message: 'Failed to create account' });
  }
}

export async function deleteUser(req, res) {
  try {
    const db = await openDB();
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required to delete." });
    }

    const currentUser = await db.get("SELECT password, role FROM users WHERE id = ?", [req.userId]);
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const isValid = await bcrypt.compare(password, currentUser.password);
    if (!isValid) return res.status(401).json({ message: "Invalid password." });

    if (currentUser.role === 'admin') {
      const targetUser = await db.get("SELECT id FROM users WHERE id = ? AND parent_id = ?", [id, req.userId]);
      if (!targetUser) return res.status(403).json({ message: "Unauthorized to delete this user" });
    } else if (currentUser.role === 'superadmin') {
      const targetUser = await db.get("SELECT id FROM users WHERE id = ?", [id]);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.id === req.userId) return res.status(400).json({ message: "SuperAdmin cannot delete themselves" });
    } else {
      return res.status(403).json({ message: "Not allowed" });
    }

    const result = await db.run("DELETE FROM users WHERE id = ?", [id]);

    if (result.changes === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
}

export async function updateUser(req, res) {
  try {
    const db = await openDB();
    const { id } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ message: "Password required" });

    const currentUser = await db.get("SELECT role FROM users WHERE id = ?", [req.userId]);
    if (currentUser.role !== 'superadmin') return res.status(403).json({ message: "Only superadmin can update admins" });

    const targetUser = await db.get("SELECT role FROM users WHERE id = ?", [id]);
    if (!targetUser || targetUser.role !== 'admin') return res.status(403).json({ message: "Can only update admins" });

    const hash = await bcrypt.hash(password, 10);
    const encPassword = encrypt(password);
    await db.run("UPDATE users SET password = ?, plain_password = ? WHERE id = ?", [hash, encPassword, id]);

    res.json({ message: "Admin password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update admin" });
  }
}

export async function impersonateUser(req, res) {
  try {
    const db = await openDB();
    const { id } = req.params;

    const currentUser = await db.get("SELECT role FROM users WHERE id = ?", [req.userId]);
    if (currentUser.role !== 'superadmin') return res.status(403).json({ message: "Only superadmin can impersonate" });

    const targetUser = await db.get("SELECT id, name, email, role FROM users WHERE id = ?", [id]);
    if (!targetUser || targetUser.role !== 'admin') return res.status(404).json({ message: "Target admin not found" });

    const token = jwt.sign({ id: targetUser.id, role: targetUser.role }, process.env.JWT_SECRET, {
      expiresIn: "6h", 
    });

    res.json({ token, user: targetUser });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: "Impersonation failed" });
  }
}
