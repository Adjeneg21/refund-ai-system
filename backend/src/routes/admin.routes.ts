import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  handleListRequests,
  handleResolveRequest,
  handleClearRequests,
} from "../controllers/adminController.js";
import { requireAdminToken } from "../security/adminAuth.js";

export const adminRouter = Router();

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests. Please slow down." },
});

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
