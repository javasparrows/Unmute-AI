import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "@/server/middleware/auth";
import { prisma } from "@/lib/prisma";
import { mapEvidence } from "@/lib/evidence/mapping/map-evidence";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string | null;
  };
};

export const evidenceRoutes = new Hono<AuthEnv>()
  .use(authMiddleware)

  // GET /api/v2/evidence/mappings?documentId=xxx
  .get(
    "/mappings",
    zValidator("query", z.object({ documentId: z.string().min(1) })),
    async (c) => {
      const { documentId } = c.req.valid("query");

      const mappings = await prisma.evidenceMapping.findMany({
        where: { documentId },
        include: {
          manuscriptCitation: {
            include: {
              paper: {
                include: { identifiers: true },
              },
            },
          },
        },
        orderBy: { sentenceIndex: "asc" },
      });

      return c.json({ mappings });
    },
  )

  // POST /api/v2/evidence/map
  .post(
    "/map",
    zValidator(
      "json",
      z.object({
        documentId: z.string().min(1),
        manuscriptCitationId: z.string().min(1),
        sentenceIndex: z.number().int(),
        manuscriptSentence: z.string().min(1),
        sectionType: z.string().optional(),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");

      const result = await mapEvidence({
        documentId: body.documentId,
        manuscriptCitationId: body.manuscriptCitationId,
        sentenceIndex: body.sentenceIndex,
        manuscriptSentence: body.manuscriptSentence,
        sectionType: body.sectionType,
      });

      return c.json(result);
    },
  )

  // POST /api/v2/evidence/verify-human
  .post(
    "/verify-human",
    zValidator(
      "json",
      z.object({
        mappingId: z.string().min(1),
        verified: z.boolean(),
        note: z.string().optional(),
      }),
    ),
    async (c) => {
      const { mappingId, verified, note } = c.req.valid("json");

      const mapping = await prisma.evidenceMapping.update({
        where: { id: mappingId },
        data: {
          humanVerified: verified,
          verifiedBy: c.get("userId"),
          verifiedAt: new Date(),
          verificationNote: note ?? null,
          verificationStatus: verified ? "verified" : "rejected",
        },
      });

      return c.json({
        id: mapping.id,
        humanVerified: mapping.humanVerified,
        verificationStatus: mapping.verificationStatus,
      });
    },
  );
