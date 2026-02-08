import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new Database(config.databasePath);

/** Run schema on startup (idempotent) */
export function initDb(): void {
  const schemaPath = join(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}

export default db;
