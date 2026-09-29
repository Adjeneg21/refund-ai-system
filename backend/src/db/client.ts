import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DATABASE_URL is expected in the form "file:./data/refund.db"
function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/refund.db";
  const relative = url.replace(/^file:/, "");
  const resolved = path.resolve(process.cwd(), relative);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

const raw = new DatabaseSync(resolveDbPath());
raw.exec("PRAGMA journal_mode = WAL;");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
raw.exec(schema);

// Defensive migration: anyone who ran the app before the admin-resolution
// columns were added has an existing refund_requests table without them.
// SQLite has no "ADD COLUMN IF NOT EXISTS", so we attempt each and ignore
// the "duplicate column" error if it's already there.
for (const col of [
  "resolved_decision TEXT",
  "resolved_at TEXT",
  "resolved_by TEXT",
]) {
  try {
    raw.exec(`ALTER TABLE refund_requests ADD COLUMN ${col}`);
  } catch {
    // column already exists — fine
  }
}

/**
 * Thin wrapper around node:sqlite's DatabaseSync.
 *
 * We use Node's built-in SQLite module (stable as of Node 24) rather than
 * better-sqlite3, specifically to avoid the native-addon compilation step —
 * better-sqlite3 requires platform-specific prebuilt binaries or a C++
 * toolchain (Visual Studio Build Tools on Windows), which makes local setup
 * fragile. node:sqlite ships inside the Node binary itself, so `npm install`
 * never needs to compile anything, on any OS or inside Docker.
 *
 * node:sqlite requires named-parameter object keys to include the SQL
 * prefix character (e.g. `{"@id": ...}`) unless bare parameters are
 * explicitly allowed. Every statement prepared here has that enabled so the
 * rest of the codebase can keep using plain keys (e.g. `{ id: ... }`)
 * against SQL written as `@id`.
 */
export const db = {
  exec: (sql: string) => raw.exec(sql),
  prepare: (sql: string) => {
    const stmt = raw.prepare(sql);
    stmt.setAllowBareNamedParameters(true);
    return stmt;
  },
};
