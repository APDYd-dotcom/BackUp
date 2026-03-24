import { openDB } from "../config/db.js";

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

    const result = await db.run(
      `INSERT INTO accounts (platform, username, password, notes, client_name, backup_codes, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [platform, username, password, notes || "", client_name || "", backup_codes || "", userId]
    );

    res.status(201).json({
      id: result.lastID,
      platform,
      username,
      password,
      notes,
      client_name,
      backup_codes
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

    res.json(accounts);
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

    const currentUser = await db.get("SELECT role FROM users WHERE id = ?", [userId]);
    
    if (existing.user_id !== userId && existing.parent_id !== userId && currentUser.role !== 'superadmin') {
      return res.status(403).json({ message: "Unauthorized to delete this account" });
    }

    await db.run("DELETE FROM accounts WHERE id = ?", [id]);

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
    const { platform, username, password, notes, client_name, backup_codes } = req.body;

    const existing = await db.get(
      `SELECT a.*, u.parent_id 
       FROM accounts a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.id = ?`,
      [id]
    );
    if (!existing) return res.status(404).json({ message: "Account not found" });

    const currentUser = await db.get("SELECT role FROM users WHERE id = ?", [userId]);
    
    if (existing.user_id !== userId && existing.parent_id !== userId && currentUser.role !== 'superadmin') {
      return res.status(403).json({ message: "Unauthorized to update this account" });
    }

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
        platform ?? existing.platform,
        username ?? existing.username,
        password ?? existing.password,
        notes ?? existing.notes,
        client_name ?? existing.client_name,
        backup_codes ?? existing.backup_codes,
        id
      ]
    );

    const updated = await db.get(
      "SELECT * FROM accounts WHERE id = ?",
      [id]
    );

    res.json(updated);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
}

