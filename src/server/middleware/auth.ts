import { createMiddleware } from "hono/factory";
import { auth } from "@/lib/auth";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string | null;
  };
};

/**
 * Auth middleware that verifies the user session and sets userId in context.
 * Replaces the repeated `await auth()` + null check pattern.
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth();

  if (!session?.user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", session.user.id);
  c.set("userEmail", session.user.email ?? null);

  await next();
});
