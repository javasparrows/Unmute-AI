import { Hono } from "hono";
import { handle } from "hono/vercel";
import { errorHandler } from "@/server/middleware/error-handler";
import { evidenceRoutes } from "@/server/routes/evidence";
import { journeyRoutes } from "@/server/routes/journey";
import { sessionRoutes } from "@/server/routes/sessions";
import { adminRoutes } from "@/server/routes/admin";
import { exportRoutes } from "@/server/routes/exports";
import { miscRoutes, publicMiscRoutes } from "@/server/routes/misc";
import { submissionRoutes } from "@/server/routes/submission";

const app = new Hono().basePath("/api/v2");

// Global error handler
app.onError(errorHandler);

// Mount route groups
app.route("/evidence", evidenceRoutes);
app.route("/journey", journeyRoutes);
app.route("/sessions", sessionRoutes);
app.route("/admin", adminRoutes);
app.route("/export", exportRoutes);
app.route("/submission", submissionRoutes);
app.route("/", publicMiscRoutes);
app.route("/", miscRoutes);

// Health check
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// Export the app type for RPC client
export type AppType = typeof app;

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
