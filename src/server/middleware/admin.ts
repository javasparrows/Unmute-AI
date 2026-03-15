import { createMiddleware } from "hono/factory";
import { auth } from "@/lib/auth";

type AdminEnv = {
  Variables: {
    userId: string;
    userEmail: string | null;
  };
};

/**
 * Admin middleware that verifies the user session and checks for ADMIN role.
 * Combines auth check and admin role check into a single middleware.
 */
export const adminMiddleware = createMiddleware<AdminEnv>(async (c, next) => {
  const session = await auth();

  if (!session?.user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (session.user.role !== "ADMIN") {
    return c.json({ error: "Forbidden" }, 403);
  }

  c.set("userId", session.user.id);
  c.set("userEmail", session.user.email ?? null);

  await next();
});
