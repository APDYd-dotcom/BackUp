import { openDB } from "../config/db.js";

/**
 * POST /api/accounts
 * Create account (AUTH REQUIRED)
 */
export async function addAccount(req, res) {
  try {
    const { platform, username, password, notes } = req.body;
    const userId = req.userId; // from auth middleware

    if (!platform || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const db = await openDB();

    const result = await db.run(
      `INSERT INTO accounts (platform, username, password, notes, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [platform, username, password, notes || "", userId]
    );

    res.status(201).json({
      id: result.lastID,
      platform,
      username,
      password,
      notes,
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

    const accounts = await db.all(
      `SELECT id, platform, username, password, notes
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

    const result = await db.run(
      "DELETE FROM accounts WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

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
    const { platform, username, password, notes } = req.body;

    await db.run(
      `UPDATE accounts
       SET platform = ?, username = ?, password = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [platform, username, password, notes || "", id, userId]
    );

    const updated = await db.get(
      "SELECT * FROM accounts WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!updated) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
}
