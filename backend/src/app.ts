import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import routes from "./routes";
import { recordRequestActivity } from "./middleware/activity";

const app = express();

// ─── Proxy ─────────────────────────────────────────────
//
// Render terminates TLS and forwards to us, so without this every request
// appears to come from the load balancer's address: `req.ip` is identical for
// the whole internet. That silently defeats every rate limiter — all visitors
// share one bucket — and made the `ipAddress` recorded against an enquiry
// useless for telling one sender from another.
//
// The count is 1, not `true`. `true` takes the left-most X-Forwarded-For entry,
// which the client writes and can therefore forge, handing an abusive caller a
// fresh identity per request and an unlimited rate limit. 1 takes the hop
// Render itself appended, which the client cannot control.
app.set("trust proxy", 1);

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
// Records every state-changing request. Mounted before the routes so it wraps
// all of them — including endpoints added later, which is the point of doing
// this here rather than one call at a time inside each controller.
app.use("/api/v1", recordRequestActivity);

app.use("/api/v1", routes);

// ─── Health Check ──────────────────────────────────────
//
// `commit` is what makes this useful to the deploy pipeline, not just to a
// monitor. A plain "ok" is answered by the *old* instance while the new build
// is still compiling, so a deploy script polling for 200 would sail straight
// through and ship a frontend against an API that had not moved yet. Reporting
// which commit is actually serving lets the workflow wait for the right one.
//
// RENDER_GIT_COMMIT is injected by Render; it is absent locally, hence "dev".
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    commit: process.env.RENDER_GIT_COMMIT ?? "dev",
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler (must be last) ───────────────
app.use(errorHandler);

export default app;
