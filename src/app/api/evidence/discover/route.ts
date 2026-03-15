import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchAllProviders } from "@/lib/providers";
import type {
  EvidenceDiscoverRequest,
  EvidenceDiscoverResponse,
  PaperCandidate,
  SearchIntent,
} from "@/types/evidence";
import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as EvidenceDiscoverRequest;
  const { query, section, fieldHint, dateRange, allowPreprints } = body;

  if (!query?.trim()) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

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
    section,
    userLanguage: "auto",
    englishQuery: searchIntent.englishQuery,
    queryVariants: searchIntent.queryVariants,
    studyTypeTargets: searchIntent.studyTypeTargets,
    dateRange,
    fieldHint,
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
      output: { candidateCount: uniqueCandidates.length, searchIntent: intent } as any,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  const response: EvidenceDiscoverResponse = {
    candidates: uniqueCandidates.slice(0, 50),
    searchIntent: intent,
    agentRunId: agentRun.id,
  };

  return Response.json(response);
}

function deduplicateByDoi(
  candidates: PaperCandidate[],
): PaperCandidate[] {
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
