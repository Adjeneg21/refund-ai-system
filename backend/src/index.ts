import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { healthRouter } from "./routes/health.routes.js";
import { refundRouter } from "./routes/refund.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { customerRouter } from "./routes/customer.routes.js";
import { seedDatabase } from "./db/seed/seed.js";

// Ensures the mock CRM data is loaded before the app starts serving requests.
seedDatabase();

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

// Rate limit refund submissions per client IP. This is a basic abuse
// safeguard, not a substitute for the policy engine's own checks — it just
// stops a single client from hammering the (potentially paid) AI endpoint.
const refundLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MIN ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refund requests. Please wait a moment and try again." },
});

app.use("/health", healthRouter);
app.use("/refund-request", refundLimiter, refundRouter);
app.use("/admin", adminRouter);
app.use("/customers", customerRouter);

app.listen(PORT, () => {
  console.log(`Refund AI backend listening on port ${PORT}`);
});
