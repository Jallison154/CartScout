import Database from "better-sqlite3";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(config.databasePath);
/** Run schema on startup (idempotent) */
export function initDb() {
    // Compiled code is in dist/db/; tsc does not copy .sql, so fall back to src/db/
    const inDist = join(__dirname, "schema.sql");
    const inSrc = join(__dirname, "../../src/db/schema.sql");
    const schemaPath = existsSync(inDist) ? inDist : inSrc;
    const schema = readFileSync(schemaPath, "utf-8");
    db.exec(schema);
}
export default db;
