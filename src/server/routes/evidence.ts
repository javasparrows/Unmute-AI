import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "@/server/middleware/auth";
import { prisma } from "@/lib/prisma";
import { mapEvidence } from "@/lib/evidence/mapping/map-evidence";
import { searchAllProviders } from "@/lib/providers";
import { providers } from "@/lib/providers";
import { findOrCreateCanonicalPaper } from "@/lib/evidence/paper-ingest";
import { extractEvidence } from "@/lib/evidence/extract-evidence";
import {
  resolveFullText,
  getEvidenceTier,
} from "@/lib/providers/fulltext-resolver";
import { compileClaims } from "@/lib/evidence/claim-compiler";
import { runAdversarialReview } from "@/lib/evidence/adversarial-review";
import { generateGroundedDraft } from "@/lib/evidence/grounded-writer";
import {
  generateBibTeXEntry,
  renderBibTeXFile,
} from "@/lib/evidence/bibtex";
import { checkCompliance } from "@/lib/guidelines/check-compliance";
import { getAllGuidelines } from "@/lib/guidelines/guideline-db";
import { generateUnmuteDisclosure } from "@/lib/guidelines/gamer-disclosure";
import {
  getRelatedPapers,
  suggestMissingPapers,
} from "@/lib/evidence/paper-relations";
import { analyzeFlow } from "@/lib/evidence/flow/analyze-flow";
import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { evidenceAutopilotRoutes } from "@/server/routes/evidence-autopilot";
import type {
  EvidenceDiscoverResponse,
  EvidenceVerifyResponse,
  FieldHint,
  PaperCandidate,
  SearchIntent,
  SectionType,
} from "@/types/evidence";

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
  )

  // POST /api/v2/evidence/discover
  .post(
    "/discover",
    zValidator(
      "json",
      z.object({
        query: z.string().min(1),
        section: z.string(),
        fieldHint: z.string().optional(),
        dateRange: z
          .object({
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .optional(),
        allowPreprints: z.boolean().optional(),
      }),
    ),
    async (c) => {
      const { query, section, fieldHint, dateRange, allowPreprints } =
        c.req.valid("json");

      // Step 1: Query expansion using Gemini
      const { object: searchIntent } = await generateObject({
        model: translationModel,
        schema: z.object({
          englishQuery: z.string(),
          queryVariants: z.array(z.string()),
          studyTypeTargets: z.array(z.string()),
          mustCoverClasses: z.array(
            z.enum([
              "landmark",
              "recent_review",
              "latest_primary",
              "guideline",
            ]),
          ),
        }),
        prompt: `You are a scholarly search query expansion expert.
Given this research query (may be in any language): "${query}"
Target section: ${section}
Field: ${fieldHint ?? "general"}

Generate:
1. An optimized English search query
2. 3-5 query variants (synonyms, related terms)
3. Study type targets relevant for this section
4. Which coverage classes are needed (landmark papers, recent reviews, latest primary research, guidelines)`,
      });

      const intent: SearchIntent = {
        section: section as SectionType,
        userLanguage: "auto",
        englishQuery: searchIntent.englishQuery,
        queryVariants: searchIntent.queryVariants,
        studyTypeTargets: searchIntent.studyTypeTargets,
        dateRange,
        fieldHint: fieldHint as FieldHint | undefined,
        allowPreprints: allowPreprints ?? false,
        mustCoverClasses: searchIntent.mustCoverClasses,
      };

      // Step 2: Search all providers with expanded queries
      const allQueries = [intent.englishQuery, ...intent.queryVariants];
      const searchOptions = {
        maxResults: 20,
        fromYear: dateRange?.from ? parseInt(dateRange.from) : undefined,
        toYear: dateRange?.to ? parseInt(dateRange.to) : undefined,
      };

      const resultsPerQuery = await Promise.allSettled(
        allQueries.map((q) => searchAllProviders(q, searchOptions)),
      );

      const candidates: PaperCandidate[] = [];
      for (const result of resultsPerQuery) {
        if (result.status === "fulfilled") {
          candidates.push(...result.value);
        }
      }

      // Deduplicate across all query results
      const uniqueCandidates = deduplicateByDoi(candidates);

      const agentRun = await prisma.agentRun.create({
        data: {
          agentType: "discovery",
          status: "completed",
          input: { query, section, fieldHint } as any,
          output: {
            candidateCount: uniqueCandidates.length,
            searchIntent: intent,
          } as any,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      const response: EvidenceDiscoverResponse = {
        candidates: uniqueCandidates.slice(0, 50),
        searchIntent: intent,
        agentRunId: agentRun.id,
      };

      return c.json(response);
    },
  )

  // POST /api/v2/evidence/verify
  .post(
    "/verify",
    zValidator(
      "json",
      z.object({
        candidate: z.any(),
      }),
    ),
    async (c) => {
      const { candidate } = c.req.valid("json");

      if (!candidate) {
        return c.json({ error: "candidate required" }, 400);
      }

      const typedCandidate = candidate as PaperCandidate;

      // Step 1: Existence verification via DOI lookup
      const doi = typedCandidate.externalIds.doi;
      let verified = false;
      let crossrefData = null;

      if (doi) {
        crossrefData = await providers.crossref.lookupByDoi!(doi);
        if (crossrefData) verified = true;
      }

      // Step 2: If DOI not found, try PMID
      if (!verified && typedCandidate.externalIds.pmid) {
        const pmidData = await providers.pubmed.lookupByPmid!(
          typedCandidate.externalIds.pmid,
        );
        if (pmidData) verified = true;
      }

      if (!verified) {
        return c.json({
          paper: {
            id: "",
            title: typedCandidate.title,
            year: typedCandidate.year,
            identifiers: typedCandidate.externalIds as Record<string, string>,
            verified: false,
          },
          evidenceSnippets: [],
          claimCards: [],
        } satisfies EvidenceVerifyResponse);
      }

      // Step 3: Find or create CanonicalPaper (unified service)
      const { paper } = await findOrCreateCanonicalPaper(typedCandidate, {
        enrichment: crossrefData,
        providerSnapshot: crossrefData
          ? { provider: "crossref", data: crossrefData }
          : undefined,
      });

      const identifiers: Record<string, string> = {};
      for (const id of paper.identifiers) {
        identifiers[id.provider] = id.externalId;
      }

      return c.json({
        paper: {
          id: paper.id,
          title: paper.title,
          year: paper.year ?? undefined,
          identifiers,
          verified: true,
        },
        evidenceSnippets: [],
        claimCards: [],
      } satisfies EvidenceVerifyResponse);
    },
  )

  // POST /api/v2/evidence/extract
  .post(
    "/extract",
    zValidator(
      "json",
      z.object({
        canonicalPaperId: z.string().min(1),
        targetClaim: z.string().optional(),
      }),
    ),
    async (c) => {
      const { canonicalPaperId, targetClaim } = c.req.valid("json");

      try {
        const result = await extractEvidence({
          canonicalPaperId,
          targetClaim,
        });
        return c.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Extraction failed";
        return c.json({ error: message }, 500);
      }
    },
  )

  // POST /api/v2/evidence/fulltext
  .post(
    "/fulltext",
    zValidator(
      "json",
      z.object({
        doi: z.string().optional(),
        pmid: z.string().optional(),
        pmcid: z.string().optional(),
        arxivId: z.string().optional(),
      }),
    ),
    async (c) => {
      const { doi, pmid, pmcid, arxivId } = c.req.valid("json");

      if (!doi && !pmid && !pmcid && !arxivId) {
        return c.json(
          { error: "At least one identifier required" },
          400,
        );
      }

      const result = await resolveFullText({ doi, pmid, pmcid, arxivId });

      if (!result) {
        return c.json({
          found: false,
          evidenceTier: "ABSTRACT_ONLY",
          sections: [],
        });
      }

      return c.json({
        found: true,
        source: result.source,
        evidenceTier: getEvidenceTier(result),
        sections: result.sections,
        format: result.format,
      });
    },
  )

  // POST /api/v2/evidence/coverage
  .post(
    "/coverage",
    zValidator(
      "json",
      z.object({
        draftText: z.string().min(1),
        documentId: z.string().optional(),
      }),
    ),
    async (c) => {
      const { draftText, documentId } = c.req.valid("json");

      // Get all approved ClaimCards for this document's citations
      const MIN_CLAIM_CONFIDENCE = 0.65;
      let claimCards: {
        id: string;
        subject: string;
        relation: string;
        object: string;
        supportLabel: string;
        confidence: number;
      }[] = [];

      if (documentId) {
        const citations = await prisma.manuscriptCitation.findMany({
          where: { documentId },
          include: {
            paper: {
              include: {
                claimCards: {
                  where: {
                    supportLabel: "SUPPORTED",
                    confidence: { gte: MIN_CLAIM_CONFIDENCE },
                  },
                },
              },
            },
          },
        });

        claimCards = citations.flatMap((ci) =>
          ci.paper.claimCards.map((cc) => ({
            id: cc.id,
            subject: cc.subject,
            relation: cc.relation,
            object: cc.object,
            supportLabel: cc.supportLabel,
            confidence: cc.confidence,
          })),
        );
      }

      const result = await compileClaims(draftText, claimCards);
      return c.json(result);
    },
  )

  // POST /api/v2/evidence/review
  .post(
    "/review",
    zValidator(
      "json",
      z.object({
        documentId: z.string().optional(),
        draftText: z.string().min(1),
        section: z.string().min(1),
      }),
    ),
    async (c) => {
      const { documentId, draftText, section } = c.req.valid("json");

      // Get ClaimCards for this document
      let claimCards: {
        id: string;
        subject: string;
        relation: string;
        object: string;
        supportLabel: string;
        confidence: number;
        evidenceTier: string;
        paperTitle: string;
      }[] = [];

      if (documentId) {
        const citations = await prisma.manuscriptCitation.findMany({
          where: { documentId },
          include: {
            paper: {
              include: {
                claimCards: true,
              },
            },
          },
        });

        claimCards = citations.flatMap((ci) =>
          ci.paper.claimCards.map((cc) => ({
            id: cc.id,
            subject: cc.subject,
            relation: cc.relation,
            object: cc.object,
            supportLabel: cc.supportLabel,
            confidence: cc.confidence,
            evidenceTier: cc.evidenceTier,
            paperTitle: ci.paper.title,
          })),
        );
      }

      // Run claim coverage check first
      const coverageReport = await compileClaims(
        draftText,
        claimCards.map((cc) => ({
          id: cc.id,
          subject: cc.subject,
          relation: cc.relation,
          object: cc.object,
          supportLabel: cc.supportLabel,
          confidence: cc.confidence,
        })),
      );

      // Run adversarial review
      const reviewResult = await runAdversarialReview({
        draftText,
        section: section as SectionType,
        claimCards,
        coverageReport: {
          overallCoverage: coverageReport.overallCoverage,
          gaps: coverageReport.gaps,
        },
      });

      // Store review findings in database if documentId provided
      if (documentId) {
        await prisma.reviewFinding.createMany({
          data: reviewResult.findings.map((f) => ({
            documentId,
            severity: f.severity,
            type: f.type,
            targetSentenceId: f.sentenceIndex?.toString(),
            explanation: f.explanation,
            suggestedFix: f.suggestedFix ?? null,
          })),
        });
      }

      return c.json({
        ...reviewResult,
        coverageReport: {
          overallCoverage: coverageReport.overallCoverage,
          gaps: coverageReport.gaps,
          sentences: coverageReport.sentences.map((s) => ({
            index: s.index,
            status: s.status,
            text: s.text,
          })),
        },
      });
    },
  )

  // POST /api/v2/evidence/write
  .post(
    "/write",
    zValidator(
      "json",
      z.object({
        documentId: z.string().min(1),
        section: z.string().min(1),
        userIntent: z.string().min(1),
        targetLanguage: z.string().optional(),
        journalId: z.string().optional(),
        existingContext: z.string().optional(),
      }),
    ),
    async (c) => {
      const {
        documentId,
        section,
        userIntent,
        targetLanguage,
        journalId,
        existingContext,
      } = c.req.valid("json");

      // Get approved ClaimCards for this document's citations
      const citations = await prisma.manuscriptCitation.findMany({
        where: { documentId },
        include: {
          paper: {
            include: {
              claimCards: {
                where: {
                  supportLabel: "SUPPORTED",
                  confidence: { gte: 0.65 },
                },
              },
              identifiers: true,
            },
          },
        },
      });

      const claimCards = citations.flatMap((ci) => {
        // Build cite key from first author + year
        const firstAuthor = ci.paper.title.split(" ")[0]; // Fallback
        const citeKey = `${firstAuthor}, ${ci.paper.year || "n.d."}`;

        return ci.paper.claimCards.map((cc) => ({
          id: cc.id,
          paperId: ci.paper.id,
          paperTitle: ci.paper.title,
          paperYear: ci.paper.year ?? undefined,
          paperAuthors: firstAuthor,
          subject: cc.subject,
          relation: cc.relation,
          object: cc.object,
          polarity: cc.polarity,
          supportLabel: cc.supportLabel,
          confidence: cc.confidence,
          evidenceTier: cc.evidenceTier,
          citeKey,
        }));
      });

      try {
        const result = await generateGroundedDraft({
          section: section as SectionType,
          userIntent,
          claimCards,
          targetLanguage: targetLanguage || "en",
          journalId,
          existingContext,
        });

        return c.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Writing failed";
        return c.json({ error: message }, 500);
      }
    },
  )

  // GET /api/v2/evidence/library?documentId=xxx
  .get(
    "/library",
    zValidator("query", z.object({ documentId: z.string().min(1) })),
    async (c) => {
      const { documentId } = c.req.valid("query");

      const citations = await prisma.manuscriptCitation.findMany({
        where: { documentId },
        include: {
          paper: {
            select: {
              id: true,
              title: true,
              authors: true,
              year: true,
              venue: true,
              citationCount: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return c.json({ citations });
    },
  )

  // GET /api/v2/evidence/bibtex?documentId=xxx
  .get(
    "/bibtex",
    zValidator("query", z.object({ documentId: z.string().min(1) })),
    async (c) => {
      const { documentId } = c.req.valid("query");

      const citations = await prisma.manuscriptCitation.findMany({
        where: { documentId },
        include: {
          paper: {
            include: { identifiers: true },
          },
        },
      });

      const entries = citations.map((ci) => {
        const identifiers: Record<string, string> = {};
        for (const id of ci.paper.identifiers) {
          if (id.provider === "crossref") identifiers.doi = id.externalId;
          if (id.provider === "pubmed") identifiers.pmid = id.externalId;
          if (id.provider === "arxiv") identifiers.arxivId = id.externalId;
        }

        const authors = Array.isArray(ci.paper.authors)
          ? (ci.paper.authors as { name: string }[])
          : [{ name: "Unknown" }];

        return generateBibTeXEntry(
          {
            title: ci.paper.title,
            authors,
            year: ci.paper.year,
            venue: ci.paper.venue,
            doi: identifiers.doi,
            pmid: identifiers.pmid,
            arxivId: identifiers.arxivId,
          },
          ci.citeKey || ci.paper.id.slice(0, 8),
        );
      });

      const bibtex = renderBibTeXFile(entries);

      return new Response(bibtex, {
        headers: {
          "Content-Type": "application/x-bibtex",
          "Content-Disposition": `attachment; filename="references.bib"`,
        },
      });
    },
  )

  // GET /api/v2/evidence/compliance?mode=guidelines or ?documentId=xxx
  .get(
    "/compliance",
    zValidator(
      "query",
      z.object({
        mode: z.string().optional(),
        documentId: z.string().optional(),
      }),
    ),
    async (c) => {
      const { mode, documentId } = c.req.valid("query");

      if (mode === "guidelines") {
        return c.json({
          guidelines: getAllGuidelines().map((g) => ({
            id: g.id,
            name: g.name,
            fullName: g.fullName,
            applicableDesigns: g.applicableDesigns,
            itemCount: g.items.length,
          })),
        });
      }

      if (!documentId) {
        return c.json({ error: "documentId required" }, 400);
      }

      const reports = await prisma.complianceReport.findMany({
        where: { documentId },
        orderBy: { createdAt: "desc" },
      });

      return c.json({ reports });
    },
  )

  // POST /api/v2/evidence/compliance
  .post(
    "/compliance",
    zValidator(
      "json",
      z.object({
        documentId: z.string().min(1),
        guidelineId: z.string().min(1),
        text: z.string().min(1),
      }),
    ),
    async (c) => {
      const { documentId, guidelineId, text } = c.req.valid("json");

      const result = await checkCompliance(guidelineId, text);

      // Store the report
      await prisma.complianceReport.create({
        data: {
          documentId,
          guidelineId,
          results: JSON.parse(JSON.stringify(result.results)),
          metCount: result.metCount,
          totalCount: result.totalCount,
          score: result.score,
        },
      });

      return c.json(result);
    },
  )

  // GET /api/v2/evidence/gamer-disclosure
  .get("/gamer-disclosure", async (c) => {
    const disclosure = generateUnmuteDisclosure();
    return c.json({ disclosure });
  })

  // GET /api/v2/evidence/related?paperId=xxx or ?documentId=xxx&mode=missing
  .get(
    "/related",
    zValidator(
      "query",
      z.object({
        paperId: z.string().optional(),
        documentId: z.string().optional(),
        mode: z.string().optional(),
      }),
    ),
    async (c) => {
      const { paperId, documentId, mode } = c.req.valid("query");

      if (mode === "missing" && documentId) {
        const suggestions = await suggestMissingPapers(documentId);
        return c.json({ suggestions });
      }

      if (paperId) {
        const related = await getRelatedPapers(paperId);
        return c.json({ related });
      }

      return c.json(
        { error: "paperId or documentId required" },
        400,
      );
    },
  )

  // POST /api/v2/evidence/flow/analyze
  .post(
    "/flow/analyze",
    zValidator(
      "json",
      z.object({
        documentId: z.string().min(1),
        sectionType: z.string().optional(),
        text: z.string().min(1),
        researchTopic: z.string().optional(),
        resultsSummary: z.string().optional(),
      }),
    ),
    async (c) => {
      const { documentId, sectionType, text, researchTopic, resultsSummary } =
        c.req.valid("json");

      const paragraphs = text
        .split("\n\n")
        .filter((p: string) => p.trim().length > 0);

      if (paragraphs.length === 0) {
        return c.json({ error: "No paragraphs to analyze" }, 400);
      }

      // Get current version number
      const latestVersion = await prisma.documentVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });

      const result = await analyzeFlow({
        sectionType: sectionType ?? "OTHER",
        paragraphs,
        researchTopic,
        resultsSummary,
      });

      // Store the analysis
      await prisma.paragraphAnalysis.create({
        data: {
          documentId,
          versionNumber: latestVersion?.versionNumber ?? 1,
          sectionType: sectionType ?? null,
          analysis: JSON.parse(JSON.stringify(result)),
          overallScore: result.overallScore,
          issueCount: result.issues.length,
        },
      });

      return c.json(result);
    },
  )

  // Mount autopilot sub-routes
  .route("/autopilot", evidenceAutopilotRoutes);

// Helper function for discover route
function deduplicateByDoi(candidates: PaperCandidate[]): PaperCandidate[] {
  const seen = new Map<string, PaperCandidate>();
  for (const c of candidates) {
    const key =
      c.externalIds?.doi ??
      c.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 50);
    if (key && !seen.has(key)) seen.set(key, c);
  }
  return Array.from(seen.values());
}
