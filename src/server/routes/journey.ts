import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "@/server/middleware/auth";
import { prisma } from "@/lib/prisma";
import { refreshJourneyStatus } from "@/lib/journey/auto-complete";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string | null;
  };
};

export const journeyRoutes = new Hono<AuthEnv>()
  .use(authMiddleware)

  // GET /api/v2/journey/:documentId
  .get("/:documentId", async (c) => {
    const documentId = c.req.param("documentId");

    await refreshJourneyStatus(documentId);

    const journey = await prisma.paperJourney.findUnique({
      where: { documentId },
      include: { taskCompletions: { orderBy: { createdAt: "desc" } } },
    });

    if (!journey) {
      return c.json({ error: "Journey not found" }, 404);
    }

    return c.json(journey);
  })

  // PATCH /api/v2/journey/:documentId
  .patch(
    "/:documentId",
    zValidator(
      "json",
      z.object({
        completeTask: z.string().optional(),
        skipTask: z.string().optional(),
        skipReason: z.string().optional(),
        guideVisible: z.boolean().optional(),
      }),
    ),
    async (c) => {
      const documentId = c.req.param("documentId");
      const body = c.req.valid("json");

      const journey = await prisma.paperJourney.findUnique({
        where: { documentId },
      });

      if (!journey) {
        return c.json({ error: "Journey not found" }, 404);
      }

      if (body.completeTask) {
        const taskStatuses =
          (journey.taskStatuses as Record<string, string>) ?? {};
        taskStatuses[body.completeTask] = "completed";

        await prisma.taskCompletion.upsert({
          where: {
            journeyId_taskId: {
              journeyId: journey.id,
              taskId: body.completeTask,
            },
          },
          create: {
            journeyId: journey.id,
            taskId: body.completeTask,
            status: "completed",
            autoCompleted: false,
            completedAt: new Date(),
          },
          update: {
            status: "completed",
            autoCompleted: false,
            completedAt: new Date(),
          },
        });

        await prisma.paperJourney.update({
          where: { id: journey.id },
          data: { taskStatuses: JSON.parse(JSON.stringify(taskStatuses)) },
        });
      }

      if (body.skipTask) {
        const taskStatuses =
          (journey.taskStatuses as Record<string, string>) ?? {};
        taskStatuses[body.skipTask] = "skipped";

        await prisma.taskCompletion.upsert({
          where: {
            journeyId_taskId: {
              journeyId: journey.id,
              taskId: body.skipTask,
            },
          },
          create: {
            journeyId: journey.id,
            taskId: body.skipTask,
            status: "skipped",
            autoCompleted: false,
            skippedReason: body.skipReason,
          },
          update: {
            status: "skipped",
            skippedReason: body.skipReason,
          },
        });

        await prisma.paperJourney.update({
          where: { id: journey.id },
          data: { taskStatuses: JSON.parse(JSON.stringify(taskStatuses)) },
        });
      }

      if (body.guideVisible !== undefined) {
        await prisma.paperJourney.update({
          where: { id: journey.id },
          data: { guideVisible: body.guideVisible },
        });
      }

      await refreshJourneyStatus(documentId);

      const updated = await prisma.paperJourney.findUnique({
        where: { documentId },
        include: { taskCompletions: true },
      });

      return c.json(updated);
    },
  );
