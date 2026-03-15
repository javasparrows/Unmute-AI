import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "@/server/middleware/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultChecklist } from "@/lib/submission/checklist-templates";

type AuthEnv = { Variables: { userId: string; userEmail: string | null } };

export const submissionRoutes = new Hono<AuthEnv>()
  .use(authMiddleware)

  // GET /submission/:documentId
  .get("/:documentId", async (c) => {
    const documentId = c.req.param("documentId");

    let plan = await prisma.submissionPlan.findUnique({
      where: { documentId },
    });

    // Auto-create with default checklist if not exists
    if (!plan) {
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            select: { journal: true },
          },
        },
      });

      plan = await prisma.submissionPlan.create({
        data: {
          documentId,
          targetJournal: doc?.versions[0]?.journal ?? null,
          checklist: JSON.parse(JSON.stringify(getDefaultChecklist())),
          reviewerCandidates: [],
        },
      });
    }

    return c.json(plan);
  })

  // PATCH /submission/:documentId
  .patch(
    "/:documentId",
    zValidator(
      "json",
      z.object({
        targetJournal: z.string().optional(),
        targetDate: z.string().optional(), // ISO date string
        coverLetter: z.string().optional(),
        checklist: z
          .array(
            z.object({
              id: z.string(),
              category: z.string(),
              label: z.string(),
              checked: z.boolean(),
              required: z.boolean(),
              notes: z.string().optional(),
            }),
          )
          .optional(),
        reviewerCandidates: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              affiliation: z.string(),
              email: z.string().optional(),
              expertise: z.string(),
              reason: z.string().optional(),
            }),
          )
          .optional(),
        notes: z.string().optional(),
      }),
    ),
    async (c) => {
      const documentId = c.req.param("documentId");
      const body = c.req.valid("json");

      const data: Record<string, unknown> = {};
      if (body.targetJournal !== undefined)
        data.targetJournal = body.targetJournal;
      if (body.targetDate !== undefined)
        data.targetDate = new Date(body.targetDate);
      if (body.coverLetter !== undefined) data.coverLetter = body.coverLetter;
      if (body.checklist !== undefined)
        data.checklist = JSON.parse(JSON.stringify(body.checklist));
      if (body.reviewerCandidates !== undefined)
        data.reviewerCandidates = JSON.parse(
          JSON.stringify(body.reviewerCandidates),
        );
      if (body.notes !== undefined) data.notes = body.notes;

      const plan = await prisma.submissionPlan.update({
        where: { documentId },
        data,
      });

      return c.json(plan);
    },
  );
