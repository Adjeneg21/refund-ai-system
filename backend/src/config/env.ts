/**
 * Central, validated runtime configuration.
 *
 * Secrets never get a hard-coded fallback: if ADMIN_TOKEN is missing the
 * server refuses to start, instead of silently running with a guessable
 * default that anyone who read the source could use.
 */

export interface AppConfig {
  adminToken: string;
  /** Browser origins allowed to call this API (CORS allow-list). */
  corsOrigins: string[];
}

const MIN_ADMIN_TOKEN_LENGTH = 16;
const DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173";

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  const adminToken = (process.env.ADMIN_TOKEN ?? "").trim();
  if (!adminToken) {
    throw new Error(
      "ADMIN_TOKEN is not set. Add a long random value to your .env file " +
        "(e.g. generate one with: openssl rand -hex 24)."
    );
  }

  const isPlaceholder = adminToken === "replace-with-a-long-random-string";
  if (adminToken.length < MIN_ADMIN_TOKEN_LENGTH || isPlaceholder) {
    const message = isPlaceholder
      ? "ADMIN_TOKEN is still the .env.example placeholder — set your own random value."
      : `ADMIN_TOKEN is shorter than ${MIN_ADMIN_TOKEN_LENGTH} characters — use a longer random value.`;
    // Hard failure in production; a warning locally so existing dev setups
    // keep working while people migrate to a stronger token.
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`[config] WARNING: ${message}`);
  }

  const corsOrigins = (process.env.CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  cached = { adminToken, corsOrigins };
  return cached;
}
