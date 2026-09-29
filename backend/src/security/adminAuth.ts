import type { Request, Response, NextFunction } from "express";

/**
 * Lightweight shared-secret gate for the admin surface.
 *
 * This is explicitly NOT real authentication (no per-user identity, no
 * password hashing, no session expiry) — it's a demo-appropriate deterrent
 * so that mutating actions (approve/deny) aren't reachable by anyone who
 * simply knows the app's URL. This is called out as a known trade-off in
 * the README rather than presented as production-grade auth.
 */
export function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_TOKEN ?? "demo-admin";
  const provided = req.header("x-admin-token");

  if (!provided || provided !== expected) {
    res.status(401).json({ error: "Missing or invalid admin token." });
    return;
  }

  next();
}
