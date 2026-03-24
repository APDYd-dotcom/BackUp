import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(arg => {
    const [k, v] = arg.split('=');
    if (k && v) {
      out[k.replace(/^--/, '')] = v;
    }
  });
  return out;
}

async function main() {
  const args = parseArgs();
  const name = args.name || 'Admin';
  const email = args.email || 'admin@example.com';
  const password = args.password || 'AdminPass123!';
  const role = args.role || 'admin';

  const dbPath = path.resolve(__dirname, '../database/vault.db');

  const db = await open({ filename: dbPath, driver: sqlite3.Database });

  try {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      console.log(`User with email ${email} already exists (id=${existing.id}). Exiting.`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, role]
    );

    console.log('Admin user created:');
    console.log({ id: result.lastID, name, email, role });
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
