import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  handleListRequests,
  handleResolveRequest,
  handleClearRequests,
} from "../controllers/adminController.js";
import { requireAdminToken } from "../security/adminAuth.js";

export const adminRouter = Router();

// General ceiling on admin traffic per client IP.
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests. Please slow down." },
});

// Brute-force protection: only 401 responses count against this budget, so
// normal use (including legitimate 4xx like a bad action) never locks anyone
// out, but guessing the token does.
const authFailureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode !== 401,
  message: { error: "Too many failed sign-in attempts. Try again in 15 minutes." },
});

adminRouter.use(adminLimiter);
adminRouter.use(authFailureLimiter);
adminRouter.use(requireAdminToken);

adminRouter.get("/requests", handleListRequests);
adminRouter.post("/requests/:id/resolve", handleResolveRequest);
adminRouter.delete("/requests", handleClearRequests);
