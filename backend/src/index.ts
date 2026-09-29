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

const config = loadConfig();

seedDatabase();

const app = express();
const PORT = process.env.PORT ?? 4000;

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

app.use(express.json({ limit: "16kb" }));

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


app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Refund AI backend listening on port ${PORT}`);
});
