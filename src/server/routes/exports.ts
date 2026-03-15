import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "@/server/middleware/auth";
import { prisma } from "@/lib/prisma";
import { buildExportManuscript } from "@/lib/export/build-manuscript";
import { renderLatex } from "@/lib/export/render-latex";
import { renderDocx } from "@/lib/export/render-docx";
import { renderEvidencePptx } from "@/lib/export/render-evidence-pptx";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string | null;
  };
};

const documentIdQuery = z.object({ documentId: z.string().min(1) });

function formatAuthors(names: string[]): string {
  if (names.length === 0) return "Unknown";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} et al.`;
}

export const exportRoutes = new Hono<AuthEnv>()
  .use(authMiddleware)

  // GET /export/latex?documentId=xxx
  .get(
    "/latex",
    zValidator("query", documentIdQuery),
    async (c) => {
      const { documentId } = c.req.valid("query");

      const manuscript = await buildExportManuscript(documentId);
      const { tex } = renderLatex(manuscript);

      const safeTitle =
        manuscript.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) ||
        "manuscript";

      return new Response(tex, {
        headers: {
          "Content-Type": "application/x-tex; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeTitle}.tex"`,
        },
      });
    },
  )

  // GET /export/docx?documentId=xxx
  .get(
    "/docx",
    zValidator("query", documentIdQuery),
    async (c) => {
      const { documentId } = c.req.valid("query");

      const manuscript = await buildExportManuscript(documentId);
      const buffer = await renderDocx(manuscript);

      const safeTitle =
        manuscript.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) ||
        "manuscript";

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
        },
      });
    },
  )

  // GET /export/evidence-pptx?documentId=xxx
  .get(
    "/evidence-pptx",
    zValidator("query", documentIdQuery),
    async (c) => {
      const { documentId } = c.req.valid("query");

      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { title: true },
      });

      if (!doc) {
        return c.json({ error: "Document not found" }, 404);
      }

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

      const slides = mappings.map((m) => {
        const authors = Array.isArray(m.manuscriptCitation.paper.authors)
          ? (m.manuscriptCitation.paper.authors as { name: string }[]).map(
              (a) => a.name,
            )
          : [];
        const doi =
          m.manuscriptCitation.paper.identifiers.find(
            (i) => i.provider === "crossref",
          )?.externalId ?? null;

        return {
          manuscriptSentence: m.manuscriptSentence,
          manuscriptSection: m.sectionType,
          supportingPassage: m.supportingPassage,
          paperTitle: m.manuscriptCitation.paper.title,
          paperAuthors: authors.length > 0 ? formatAuthors(authors) : "Unknown",
          paperYear: m.manuscriptCitation.paper.year,
          paperSection: m.citedPaperSection,
          paperPage: m.citedPaperPage,
          doi,
          pdfUrl: m.screenshotUrl,
          confidence: m.confidence,
          rationale: m.mappingRationale,
          humanVerified: m.humanVerified,
          verifiedBy: m.verifiedBy,
          verifiedAt: m.verifiedAt,
        };
      });

      const buffer = await renderEvidencePptx(doc.title, slides);

      const safeTitle =
        doc.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "evidence";

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${safeTitle}_evidence.pptx"`,
        },
      });
    },
  );
