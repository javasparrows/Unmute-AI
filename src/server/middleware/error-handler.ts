import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[API Error] ${c.req.method} ${c.req.path}:`, err.message);

  if (err.message.includes("Unauthorized")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ error: err.message || "Internal server error" }, 500);
};
