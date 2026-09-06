import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import routes from "./routes";

const app = express();

// ─── Security Middleware ───────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));

// ─── Body Parsing ──────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─── Rate Limiting ─────────────────────────────────────
// app.use('/api', apiLimiter);

// ─── API Routes ────────────────────────────────────────
app.use("/api/v1", routes);

// ─── Health Check ──────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Global Error Handler (must be last) ───────────────
app.use(errorHandler);

export default app;
