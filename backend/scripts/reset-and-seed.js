import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database/vault.db');

async function main() {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  console.log('Clearing all existing data...');
  await db.run('DELETE FROM accounts');
  await db.run('DELETE FROM users');
  
  console.log('Creating Super Admin user...');
  const superHash = await bcrypt.hash('APDY!@pro2060', 10);
  await db.run(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    ['SuperAdmin', 'arakazaprincedestinyvan@gmail.com', superHash, 'superadmin']
  );
  
  console.log('Reset and seed completed successfully!');
  await db.close();
}

main().catch(console.error);
