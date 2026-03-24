import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../database/vault.db');

async function recoverSuperAdmin(email, newPassword) {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const existing = await db.get("SELECT id FROM users WHERE email = ? AND role = 'superadmin'", [email]);

    if (existing) {
      await db.run("UPDATE users SET password = ? WHERE id = ?", [hash, existing.id]);
      console.log(`✅ Super Admin (${email}) password updated successfully.`);
    } else {
      await db.run(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        ['SuperAdmin', email, hash, 'superadmin']
      );
      console.log(`✅ New Super Admin (${email}) created successfully.`);
    }
  } catch (err) {
    console.error("❌ Recovery failed:", err);
  } finally {
    await db.close();
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node recover-superadmin.js <email> <new_password>");
  process.exit(1);
}

recoverSuperAdmin(args[0], args[1]);
