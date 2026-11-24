import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import { getUsers, getUserAccounts, createUser, deleteUser, createAccountForUser, updateUser, impersonateUser } from "../controllers/admin.controller.js";
import { openDB } from "../config/db.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/users", getUsers);
router.get("/users/:id/accounts", getUserAccounts);
router.post("/users", createUser);
router.delete("/users/:id", deleteUser);
router.put("/users/:id", updateUser);
router.post("/users/:id/impersonate", impersonateUser);
router.post("/users/:id/accounts", createAccountForUser);

router.get("/notifications", async (req, res) => {
  if (req.userRole !== "superadmin") return res.status(403).json({ message: "Super Admin access required" });
  const db = await openDB();
  const notifications = await db.all(
    "SELECT * FROM notifications WHERE recipient_id=? ORDER BY created_at DESC LIMIT 100",
    [req.userId],
  );
  res.json(notifications);
});

router.post("/notifications/:id/read", async (req, res) => {
  if (req.userRole !== "superadmin") return res.status(403).json({ message: "Super Admin access required" });
  const db = await openDB();
  await db.run(
    "UPDATE notifications SET read_at=datetime('now') WHERE id=? AND recipient_id=?",
    [req.params.id, req.userId],
  );
  res.json({ read: true });
});

router.get("/audit", async (req, res) => {
  if (req.userRole !== "superadmin") return res.status(403).json({ message: "Super Admin access required" });
  const db = await openDB();
  const { user, action, from, to, limit = "100" } = req.query;
  const clauses = [];
  const values = [];
  if (user) {
    clauses.push("al.user_id = ?");
    values.push(user);
  }
  if (action) {
    clauses.push("al.action LIKE ?");
    values.push(`%${action}%`);
  }
  if (from) {
    clauses.push("al.created_at >= ?");
    values.push(from);
  }
  if (to) {
    clauses.push("al.created_at <= ?");
    values.push(to);
  }
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 500);
  const rows = await db.all(
    `SELECT al.*, u.name AS user_name, u.email AS user_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id=al.user_id
     ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
     ORDER BY al.created_at DESC
     LIMIT ?`,
    [...values, safeLimit],
  );
  res.json(rows);
});

router.get("/login-approvals/pending", async (req, res) => {
  if (req.userRole !== "superadmin") return res.status(403).json({ message: "Super Admin access required" });
  const db = await openDB();
  const rows = await db.all(
    `SELECT lar.*, u.name AS user_name, u.email AS user_email
     FROM login_approval_requests lar
     JOIN users u ON u.id=lar.user_id
     WHERE lar.status='pending' AND lar.expires_at > datetime('now')
     ORDER BY lar.created_at DESC`,
  );
  res.json(rows.map(row => ({
    ...row,
    numbers: JSON.parse(row.other_numbers),
  })));
});

export default router;
