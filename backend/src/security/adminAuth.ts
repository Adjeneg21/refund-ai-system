import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { loadConfig } from "../config/env.js";


const sha256 = (value: string): Buffer =>
  createHash("sha256").update(value).digest();

let expectedHash: Buffer | null = null;

export function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  expectedHash ??= sha256(loadConfig().adminToken);

  const provided = sha256(req.header("x-admin-token") ?? "");

  if (!timingSafeEqual(provided, expectedHash)) {
    res.status(401).json({ error: "Missing or invalid admin token." });
    return;
  }

  next();
}
