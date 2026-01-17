import { openDB } from "../config/db.js"; // must match exactly

// export async function getAccounts(req, res) {
//   const db = await openDB();
//   const accounts = await db.all("SELECT * FROM accounts");
//   res.json(accounts);
// }

export async function addAccount(req, res) {
  const { platform, username, password, notes } = req.body;
  const db = await openDB();
  await db.run(
    "INSERT INTO accounts (platform, username, password, notes) VALUES (?, ?, ?, ?)",
    [platform, username, password, notes || ""]
  );
  res.status(201).json({ message: "Account added" });
}

export async function getAccounts(req, res) {
  try {
    const db = await openDB();
    const accounts = await db.all("SELECT id, platform, username, password FROM accounts");
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
}

/**
 * DELETE /api/accounts/:id
 */
export const deleteAccount = async (req, res) => {
  try {
    const db = await openDB();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Account ID is required" });
    }

    const result = await db.run(
      "DELETE FROM accounts WHERE id = ?",
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
};


export const updateAccount = async (req, res) => {
  const db = await openDB();
  const { id } = req.params;
  const { platform, username, password } = req.body;

  try {
    await db.run(
      "UPDATE accounts SET platform = ?, username = ?, password = ? WHERE id = ?",
      [platform, username, password, id]
    );

    const updated = await db.get(
      "SELECT * FROM accounts WHERE id = ?",
      [id]
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};

