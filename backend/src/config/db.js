import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the SQLite database
const dbPath = path.resolve(__dirname, "../../database/vault.db");

export async function openDB() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}
