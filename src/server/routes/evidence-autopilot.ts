import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { providers } from "@/lib/providers";
import { analyzeForCitations, suggestCitations } from "@/lib/evidence/autopilot";
import { findOrCreateCanonicalPaper } from "@/lib/evidence/paper-ingest";
import { generateCiteKey } from "@/lib/evidence/cite-key";
import { generateBibTeXEntry, renderBibTeX } from "@/lib/evidence/bibtex";
import { addPaperRelation } from "@/lib/evidence/paper-relations";
import type { SectionType, PaperCandidate } from "@/types/evidence";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string | null;
  };
};

export const evidenceAutopilotRoutes = new Hono<AuthEnv>()

  // POST /api/v2/evidence/autopilot/analyze
  .post(
    "/analyze",
    zValidator(
      "json",
      z.object({
        text: z.string().min(1),
        section: z.string().optional(),
      }),
    ),
    async (c) => {
      const { text, section } = c.req.valid("json");

      try {
        const analysis = await analyzeForCitations(
          text,
          (section || "INTRODUCTION") as SectionType,
        );
        return c.json(analysis);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Analysis failed";
        return c.json({ error: message }, 500);
      }
    },
  )

  // POST /api/v2/evidence/autopilot/suggest
  .post(
    "/suggest",
    zValidator(
      "json",
      z.object({
        sentence: z.string().min(1),
        section: z.string().optional(),
        existingCiteKeys: z.array(z.string()).optional(),
      }),
    ),
    async (c) => {
      const { sentence, section, existingCiteKeys } = c.req.valid("json");

      try {
        const result = await suggestCitations(
          sentence,
          (section || "INTRODUCTION") as SectionType,
          existingCiteKeys || [],
        );
        return c.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Suggestion failed";
        return c.json({ error: message }, 500);
      }
    },
  )

  // POST /api/v2/evidence/autopilot/accept
  .post(
    "/accept",
    zValidator(
      "json",
      z.object({
        documentId: z.string().min(1),
        candidate: z.any().optional(),
        sentenceIndex: z.number().int(),
        sectionType: z.string(),
        action: z.enum(["ACCEPT", "SKIP"]),
      }),
    ),
    async (c) => {
      const { documentId, candidate, sentenceIndex, sectionType, action } =
        c.req.valid("json");

      if (action === "SKIP") {
        return c.json({ action: "SKIP", sentenceIndex });
      }

      if (!candidate) {
        return c.json({ error: "candidate required for ACCEPT" }, 400);
      }

      const typedCandidate = candidate as PaperCandidate;

      // 1. Verify paper exists (DOI lookup)
      const doi = typedCandidate.externalIds?.doi;
      let verified = false;
      let crossrefData = null;

      if (doi) {
        crossrefData = await providers.crossref.lookupByDoi!(doi);
        if (crossrefData) verified = true;
      }

      if (!verified && typedCandidate.externalIds?.pmid) {
        const pmidResult = await providers.pubmed.lookupByPmid!(
          typedCandidate.externalIds.pmid,
        );
        if (pmidResult) verified = true;
      }

      if (!verified) {
        return c.json(
          {
            error:
              "Paper verification failed. Cannot cite unverified paper.",
          },
          422,
        );
      }

      // 2. Find or create CanonicalPaper (unified service)
      const { paper } = await findOrCreateCanonicalPaper(typedCandidate, {
        enrichment: crossrefData,
        providerSnapshot: crossrefData
          ? { provider: "crossref", data: crossrefData }
          : undefined,
      });

      // 3. Generate cite key
      const existingCitations = await prisma.manuscriptCitation.findMany({
        where: { documentId },
        select: { citeKey: true },
      });
      const existingKeys = new Set(
        existingCitations
          .map((ci) => ci.citeKey)
          .filter(Boolean) as string[],
      );

      const authors = typedCandidate.authors?.map((a) => ({
        name: a.name,
      })) ?? [{ name: "Unknown" }];
      const citeKey = generateCiteKey(
        authors,
        typedCandidate.year,
        typedCandidate.title,
        existingKeys,
      );

      // 4. Create ManuscriptCitation (upsert)
      const citation = await prisma.manuscriptCitation.upsert({
        where: {
          documentId_paperId: { documentId, paperId: paper.id },
        },
        create: {
          documentId,
          paperId: paper.id,
          sectionType,
          citeKey,
        },
        update: {},
      });

      // 5. Create anchor for this specific occurrence
      await prisma.manuscriptCitationAnchor.create({
        data: {
          manuscriptCitationId: citation.id,
          sectionType,
          sentenceIndex,
        },
      });

      // 6. Generate BibTeX entry
      const identifiers: Record<string, string> = {};
      for (const id of paper.identifiers) {
        if (id.provider === "crossref") identifiers.doi = id.externalId;
        if (id.provider === "pubmed") identifiers.pmid = id.externalId;
        if (id.provider === "arxiv") identifiers.arxivId = id.externalId;
      }

      const bibEntry = generateBibTeXEntry(
        {
          ...typedCandidate,
          doi: identifiers.doi,
          pmid: identifiers.pmid,
          arxivId: identifiers.arxivId,
        },
        citeKey,
      );

      // Background: create relations between this paper and other cited papers
      const otherCitations = await prisma.manuscriptCitation.findMany({
        where: { documentId, paperId: { not: paper.id } },
        select: { paperId: true },
      });

      // Fire-and-forget: don't await
      Promise.allSettled(
        otherCitations.map((other) =>
          addPaperRelation(paper.id, other.paperId, "related"),
        ),
      ).catch(() => {});

      return c.json({
        action: "ACCEPT",
        sentenceIndex,
        citeKey,
        citeCommand: `\\cite{${citeKey}}`,
        paperId: paper.id,
        paperTitle: paper.title,
        bibtex: renderBibTeX(bibEntry),
      });
    },
  );
