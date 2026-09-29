import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { loadConfig } from "../config/env.js";

/**
 * Lightweight shared-secret gate for the admin surface.
 *
 * This is explicitly NOT real authentication (no per-user identity, no
 * password hashing, no session expiry) — it's a demo-appropriate deterrent
 * so that mutating actions (approve/deny) aren't reachable by anyone who
 * simply knows the app's URL. This is called out as a known trade-off in
 * the README rather than presented as production-grade auth.
 *
 * Hardening that IS in place:
 *  - no default token: the server won't start without ADMIN_TOKEN
 *    (see config/env.ts);
 *  - constant-time comparison, so response timing leaks nothing about how
 *    many leading characters of a guess were correct;
 *  - failed attempts are rate limited per IP (see routes/admin.routes.ts).
 */

const sha256 = (value: string): Buffer =>
  createHash("sha256").update(value).digest();

let expectedHash: Buffer | null = null;

export function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  expectedHash ??= sha256(loadConfig().adminToken);

  // Hashing both sides gives equal-length buffers (timingSafeEqual throws on
  // a length mismatch, and comparing raw lengths would itself leak length).
  const provided = sha256(req.header("x-admin-token") ?? "");

  if (!timingSafeEqual(provided, expectedHash)) {
    res.status(401).json({ error: "Missing or invalid admin token." });
    return;
  }

  next();
}
