import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { healthRouter } from "./routes/health.routes.js";
import { refundRouter } from "./routes/refund.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { customerRouter } from "./routes/customer.routes.js";
import { seedDatabase } from "./db/seed/seed.js";
import { loadConfig } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Validate configuration first: refuses to start without ADMIN_TOKEN.
const config = loadConfig();

// Ensures the mock CRM data is loaded before the app starts serving requests.
seedDatabase();

const app = express();
const PORT = process.env.PORT ?? 4000;

// CORS allow-list (CORS_ORIGINS, comma-separated). Requests with no Origin
// header (curl, server-to-server) are unaffected — CORS only constrains
// browsers. Disallowed origins simply get no CORS headers and are blocked
// by the browser.
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || config.corsOrigins.includes(origin));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-token", "x-admin-name"],
    maxAge: 600,
  })
);
// Refund reasons are capped at 2000 chars, so a small body limit is plenty.
app.use(express.json({ limit: "16kb" }));

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

// Must come after all routes: JSON 404s and a JSON error handler.
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Refund AI backend listening on port ${PORT}`);
});
