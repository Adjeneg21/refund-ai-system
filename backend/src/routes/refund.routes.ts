import { Router } from "express";
import rateLimit from "express-rate-limit";
import { handleRefundRequest } from "../controllers/refundController.js";

export const refundRouter = Router();

// Basic abuse protection on the public-facing submission endpoint. Limits
// are per client IP; tune via RATE_LIMIT_PER_MIN for local/demo use.
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MIN ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refund requests from this client — please slow down." },
});

refundRouter.post("/", submissionLimiter, handleRefundRequest);
