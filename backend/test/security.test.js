import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import {
  generateTotpSecret,
  totpCode,
  verifyTotp,
  randomDigits,
  hashSecret,
  secureEqual,
} from "../src/utils/security.js";

test("randomDigits returns only the requested number of digits", () => {
  const value = randomDigits(6);
  assert.match(value, /^\d{6}$/);
});

test("secret hashes are constant-time comparable", () => {
  assert.equal(secureEqual(hashSecret("123456"), hashSecret("123456")), true);
  assert.equal(secureEqual(hashSecret("123456"), hashSecret("654321")), false);
});

test("TOTP secret generates a valid six-digit code", () => {
  const secret = generateTotpSecret();
  const code = totpCode(secret);
  assert.match(code, /^\d{6}$/);
  assert.equal(verifyTotp(secret, code), true);
});

test("TOTP rejects malformed codes", () => {
  const secret = generateTotpSecret();
  assert.equal(verifyTotp(secret, "abcdef"), false);
});

async function openTemporaryDatabase(databasePath) {
  const baseDb = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });
  await baseDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT
    );
  `);
  await baseDb.close();
  const { openDB } = await import("../src/config/db.js");
  return openDB();
}

test("append-only audit triggers reject updates and deletes", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-security-"));
  const oldDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = path.join(tempDir, "test.db");

  try {
    const db = await openTemporaryDatabase(process.env.DATABASE_PATH);
    const inserted = await db.run(
      "INSERT INTO audit_logs (action, result) VALUES (?, ?)",
      ["unit.audit", "success"],
    );
    await assert.rejects(
      db.run("UPDATE audit_logs SET action=? WHERE id=?", ["changed", inserted.lastID]),
      /append-only/,
    );
    await assert.rejects(
      db.run("DELETE FROM audit_logs WHERE id=?", [inserted.lastID]),
      /append-only/,
    );
    await db.close();
  } finally {
    if (oldDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = oldDatabasePath;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("action approvals bind action, resource type, and resource id", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-action-"));
  const oldDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = path.join(tempDir, "test.db");

  try {
    const db = await openTemporaryDatabase(process.env.DATABASE_PATH);
    await db.run(
      "INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)",
      ["Action User", "action@example.test", "test-password", "user"],
    );
    const user = await db.get("SELECT id FROM users WHERE email=?", ["action@example.test"]);
    await db.run(
      `INSERT INTO action_approvals
       (requester_id, action, resource_type, resource_id, otp_hash, expires_at)
       VALUES (?, 'delete', 'account', '42', ?, datetime('now', '+10 minutes'))`,
      [user.id, hashSecret("123456")],
    );
    const approval = await db.get("SELECT * FROM action_approvals WHERE requester_id=?", [user.id]);

    assert.equal(approval.action, "delete");
    assert.equal(approval.resource_type, "account");
    assert.equal(approval.resource_id, "42");
    assert.equal(secureEqual(approval.otp_hash, hashSecret("123456")), true);
    assert.equal(secureEqual(approval.otp_hash, hashSecret("654321")), false);
    await db.close();
  } finally {
    if (oldDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = oldDatabasePath;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
