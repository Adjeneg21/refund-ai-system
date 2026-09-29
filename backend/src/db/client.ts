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

export const db = {
  exec: (sql: string) => raw.exec(sql),
  prepare: (sql: string) => {
    const stmt = raw.prepare(sql);
    stmt.setAllowBareNamedParameters(true);
    return stmt;
  },
};
