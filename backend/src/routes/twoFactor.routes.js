import express from "express";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { openDB } from "../config/db.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import {
  generateTotpSecret,
  verifyTotp,
  randomDigits,
  hashSecret,
  secureEqual,
} from "../utils/security.js";
import { sendMail } from "../services/mail.service.js";
import { isSmtpConfigured } from "../services/mail.service.js";

const router = express.Router();
router.use(async (req, res, next) => {
  const authorization = req.headers.authorization;
  const challengeToken = req.headers["x-2fa-challenge"];
  let payload = null;

  if (authorization?.startsWith("Bearer ")) {
    try {
      payload = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid session" });
    }
  } else if (challengeToken) {
    try {
      payload = jwt.verify(challengeToken, process.env.JWT_SECRET);
      if (payload.purpose !== "2fa-login") {
        return res.status(401).json({ message: "Invalid 2FA challenge" });
      }
    } catch {
      return res.status(401).json({ message: "2FA challenge expired" });
    }
  } else {
    return res.status(401).json({ message: "Authentication required" });
  }

  req.userId = payload.id;
  req.userRole = payload.role;
  next();
});

router.get("/status", async (req, res) => {
  const db = await openDB();
  const settings = await db.get("SELECT * FROM two_factor_settings WHERE user_id = ?", [req.userId]);
  res.json({
    emailEnabled: Boolean(settings?.email_enabled),
    totpEnabled: Boolean(settings?.totp_enabled),
    smtpConfigured: isSmtpConfigured(),
    smtpFrom: isSmtpConfigured() ? process.env.SMTP_FROM || process.env.SMTP_USER : null,
  });
});

router.post("/totp/setup", async (req, res) => {
  const db = await openDB();
  const user = await db.get("SELECT name, email FROM users WHERE id = ?", [req.userId]);
  const secret = generateTotpSecret();
  await db.run(
    `INSERT INTO two_factor_settings (user_id, totp_secret_encrypted)
     VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       totp_secret_encrypted = excluded.totp_secret_encrypted,
       totp_enabled = 0,
       updated_at = datetime('now')`,
    [req.userId, encrypt(secret)],
  );

  const otpauth = `otpauth://totp/Vault:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Vault`;
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
  res.json({ qrCodeDataUrl, manualKey: secret });
});

router.post("/totp/verify", async (req, res) => {
  const { code } = req.body;
  const db = await openDB();
  const settings = await db.get("SELECT totp_secret_encrypted FROM two_factor_settings WHERE user_id = ?", [req.userId]);
  if (!settings?.totp_secret_encrypted) {
    return res.status(400).json({ message: "Start TOTP setup first" });
  }

  const secret = decrypt(settings.totp_secret_encrypted);
  if (!verifyTotp(secret, code)) {
    return res.status(400).json({ message: "Invalid authenticator code" });
  }

  await db.run(
    "UPDATE two_factor_settings SET totp_enabled = 1, updated_at = datetime('now') WHERE user_id = ?",
    [req.userId],
  );

  const backupCodes = [];
  await db.run("DELETE FROM backup_codes WHERE user_id = ?", [req.userId]);
  for (let index = 0; index < 10; index += 1) {
    const raw = `${randomDigits(4)}-${randomDigits(4)}`;
    backupCodes.push(raw);
    await db.run(
      "INSERT INTO backup_codes (user_id, code_hash) VALUES (?, ?)",
      [req.userId, hashSecret(raw)],
    );
  }

  res.json({ enabled: true, backupCodes });
});

router.post("/email/send", async (req, res) => {
  const { purpose = "login" } = req.body;
  const db = await openDB();
  const user = await db.get("SELECT name, email FROM users WHERE id = ?", [req.userId]);

  const latest = await db.get(
    "SELECT created_at FROM email_otps WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1",
    [req.userId, purpose],
  );
  if (latest) {
    const elapsed = Date.now() - new Date(`${latest.created_at}Z`).getTime();
    if (elapsed < 60 * 1000) {
      return res.status(429).json({
        message: "Please wait before requesting another code",
        retryAfterSeconds: Math.ceil((60 * 1000 - elapsed) / 1000),
      });
    }
  }

  const code = randomDigits(6);
  await db.run(
    "UPDATE email_otps SET used_at = COALESCE(used_at, datetime('now')) WHERE user_id = ? AND purpose = ? AND used_at IS NULL",
    [req.userId, purpose],
  );
  await db.run(
    "INSERT INTO email_otps (user_id, code_hash, purpose, expires_at) VALUES (?, ?, ?, datetime('now', '+5 minutes'))",
    [req.userId, hashSecret(code), purpose],
  );

  const mailResult = await sendMail({
    to: user.email,
    subject: "Your Vault verification code",
    text: `Hello ${user.name}, your Vault verification code is ${code}. It expires in 5 minutes.`,
  });

  if (mailResult?.failed || mailResult?.skipped) {
    await db.run("UPDATE email_otps SET used_at=datetime('now') WHERE id=(SELECT id FROM email_otps WHERE user_id=? AND purpose=? ORDER BY created_at DESC LIMIT 1)", [req.userId, purpose]);
    return res.status(503).json({
      message: "Email delivery is not configured or could not deliver the code",
      smtpConfigured: isSmtpConfigured(),
    });
  }

  res.json({ sent: true, expiresInSeconds: 300, smtpConfigured: true });
});

router.post("/email/verify", async (req, res) => {
  const { code, purpose = "login" } = req.body;
  const db = await openDB();
  const otp = await db.get(
    `SELECT * FROM email_otps
     WHERE user_id = ? AND purpose = ? AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [req.userId, purpose],
  );

  if (!otp) return res.status(400).json({ message: "No active verification code" });
  if (new Date(`${otp.expires_at}Z`).getTime() <= Date.now()) {
    await db.run("UPDATE email_otps SET used_at = datetime('now') WHERE id = ?", [otp.id]);
    return res.status(400).json({ message: "Verification code expired" });
  }
  if (otp.attempts >= 5) {
    await db.run("UPDATE email_otps SET used_at = datetime('now') WHERE id = ?", [otp.id]);
    return res.status(400).json({ message: "Verification code invalidated after too many attempts" });
  }

  const candidateHash = hashSecret(code);
  if (!secureEqual(candidateHash, otp.code_hash)) {
    await db.run("UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?", [otp.id]);
    return res.status(400).json({
      message: "Invalid verification code",
      attemptsRemaining: Math.max(0, 4 - otp.attempts),
    });
  }

  await db.run("UPDATE email_otps SET used_at = datetime('now') WHERE id = ?", [otp.id]);
  if (purpose === "enable-email") {
    await db.run(
      `INSERT INTO two_factor_settings (user_id, email_enabled)
       VALUES (?, 1)
       ON CONFLICT(user_id) DO UPDATE SET email_enabled = 1, updated_at = datetime('now')`,
      [req.userId],
    );
  }

  res.json({ verified: true });
});

router.post("/disable", async (req, res) => {
  const { emailCode, totpCode, password } = req.body;
  const db = await openDB();
  const user = await db.get("SELECT password FROM users WHERE id = ?", [req.userId]);
  const bcrypt = (await import("bcryptjs")).default;
  if (!user || !(await bcrypt.compare(password || "", user.password))) {
    return res.status(401).json({ message: "Password verification required" });
  }

  const settings = await db.get("SELECT * FROM two_factor_settings WHERE user_id = ?", [req.userId]);
  if (!settings) return res.json({ disabled: true });

  if (settings.totp_enabled) {
    const secret = decrypt(settings.totp_secret_encrypted);
    if (!verifyTotp(secret, totpCode)) {
      return res.status(400).json({ message: "Authenticator verification required" });
    }
  }

  await db.run(
    "UPDATE two_factor_settings SET totp_enabled = 0, email_enabled = 0, totp_secret_encrypted = NULL, updated_at = datetime('now') WHERE user_id = ?",
    [req.userId],
  );
  await db.run("DELETE FROM backup_codes WHERE user_id = ?", [req.userId]);
  res.json({ disabled: true });
});

export default router;
