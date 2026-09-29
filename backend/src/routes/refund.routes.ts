import { Router } from "express";
import rateLimit from "express-rate-limit";
import { handleRefundRequest } from "../controllers/refundController.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const refundRouter = Router();

const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MIN ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refund requests from this client — please slow down." },
});

refundRouter.post("/", submissionLimiter, asyncHandler(handleRefundRequest));
