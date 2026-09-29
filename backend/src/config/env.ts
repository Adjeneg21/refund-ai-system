/**
 * Central, validated runtime configuration.
 *
 * There is no hard-coded default admin token. If ADMIN_TOKEN is unset:
 *  - in production the server refuses to start;
 *  - otherwise (local dev / `docker compose up` on a fresh clone) a random
 *    token is generated once, saved to data/.admin-token so it survives
 *    restarts, and printed in the startup log. The app therefore works with
 *    a single command, and no guessable secret ever exists in the source.
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface AppConfig {
  adminToken: string;
  /** True when the token was generated locally rather than supplied via env. */
  adminTokenGenerated: boolean;
  /** Browser origins allowed to call this API (CORS allow-list). */
  corsOrigins: string[];
}

const MIN_ADMIN_TOKEN_LENGTH = 16;
const PLACEHOLDER_TOKEN = "replace-with-a-long-random-string";
const DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173";

let cached: AppConfig | null = null;

function loadOrCreateDevToken(): string {
  const dir = path.resolve(process.cwd(), "data");
  const file = path.join(dir, ".admin-token");
  try {
    const existing = fs.readFileSync(file, "utf-8").trim();
    if (existing) return existing;
  } catch {
    // no saved token yet — generate one below
  }
  const token = randomBytes(24).toString("hex");
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, token, { mode: 0o600 });
  } catch {
    // Read-only filesystem etc. — the token still works for this run.
  }
  return token;
}

export function loadConfig(): AppConfig {
  if (cached) return cached;

  const isProduction = process.env.NODE_ENV === "production";
  let adminToken = (process.env.ADMIN_TOKEN ?? "").trim();
  let adminTokenGenerated = false;

  if (!adminToken) {
    if (isProduction) {
      throw new Error(
        "ADMIN_TOKEN is not set. In production it is required — use a long random value " +
          "(e.g. generate one with: openssl rand -hex 24)."
      );
    }
    adminToken = loadOrCreateDevToken();
    adminTokenGenerated = true;
    console.warn(
      `[config] ADMIN_TOKEN is not set — using a generated development token:\n` +
        `[config]   ${adminToken}\n` +
        `[config] (saved to data/.admin-token; set ADMIN_TOKEN in .env to choose your own)`
    );
  } else if (adminToken.length < MIN_ADMIN_TOKEN_LENGTH || adminToken === PLACEHOLDER_TOKEN) {
    const message =
      adminToken === PLACEHOLDER_TOKEN
        ? "ADMIN_TOKEN is still the .env.example placeholder — set your own random value."
        : `ADMIN_TOKEN is shorter than ${MIN_ADMIN_TOKEN_LENGTH} characters — use a longer random value.`;
    // Hard failure in production; a warning locally so existing dev setups
    // keep working while people migrate to a stronger token.
    if (isProduction) throw new Error(message);
    console.warn(`[config] WARNING: ${message}`);
  }

  const corsOrigins = (process.env.CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  cached = { adminToken, adminTokenGenerated, corsOrigins };
  return cached;
}
