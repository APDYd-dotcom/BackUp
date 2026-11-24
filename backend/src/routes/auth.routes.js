import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { openDB } from "../config/db.js";
import "../config/env.js";

const router = express.Router();

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
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const db = await openDB();

    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Allow all users to login (admins, superadmins, and normal users)
    // The frontend handles redirection based on role.
    if (!user.role) {
      return res.status(403).json({ message: 'User role not defined' });
    }

    // Ensure admin has a password
    if (!user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password || '');
    if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
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
