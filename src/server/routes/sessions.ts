import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "@/server/middleware/auth";
import { prisma } from "@/lib/prisma";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string | null;
  };
};

export const sessionRoutes = new Hono<AuthEnv>()
  .use(authMiddleware)

  // POST /api/v2/sessions/start
  .post(
    "/start",
    zValidator("json", z.object({ documentId: z.string().min(1) })),
    async (c) => {
      const { documentId } = c.req.valid("json");
      const userId = c.get("userId");

      const version = await prisma.documentVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: "desc" },
        select: { translatedText: true },
      });

      const session = await prisma.writingSession.create({
        data: {
          userId,
          documentId,
          wordsAtStart: version?.translatedText?.length ?? 0,
          status: "ACTIVE",
        },
      });

      return c.json({ id: session.id });
    },
  )

  // POST /api/v2/sessions/end
  .post(
    "/end",
    zValidator(
      "json",
      z.object({
        sessionId: z.string().min(1),
        pomodoroCount: z.number().int().optional(),
      }),
    ),
    async (c) => {
      const { sessionId, pomodoroCount } = c.req.valid("json");

      const writingSession = await prisma.writingSession.findUnique({
        where: { id: sessionId },
      });

      if (!writingSession) {
        return c.json({ error: "Session not found" }, 404);
      }

      const version = await prisma.documentVersion.findFirst({
        where: { documentId: writingSession.documentId },
        orderBy: { versionNumber: "desc" },
        select: { translatedText: true },
      });

      const wordsAtEnd = version?.translatedText?.length ?? 0;
      const wordsWritten = Math.max(
        0,
        wordsAtEnd - writingSession.wordsAtStart,
      );

      const updated = await prisma.writingSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          wordsAtEnd,
          wordsWritten,
          pomodoroCount: pomodoroCount ?? writingSession.pomodoroCount,
        },
      });

      return c.json({
        id: updated.id,
        wordsWritten: updated.wordsWritten,
        pomodoroCount: updated.pomodoroCount,
        duration:
          updated.endedAt && updated.startedAt
            ? Math.round(
                (updated.endedAt.getTime() - updated.startedAt.getTime()) /
                  1000 /
                  60,
              )
            : 0,
      });
    },
  );
