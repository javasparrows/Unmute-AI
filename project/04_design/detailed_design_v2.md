# Unmute AI v2 -- Detailed Design

Document ID: DD-v2
Date: 2026-03-15
Status: Draft
Scope: Evidence Mapping System, Paragraph Flow Analysis, Guideline Compliance, Evidence Export

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Evidence Mapping System](#2-evidence-mapping-system)
3. [Paragraph Flow Analysis System](#3-paragraph-flow-analysis-system)
4. [Guideline Compliance Checker](#4-guideline-compliance-checker)
5. [Evidence Export (PowerPoint)](#5-evidence-export-powerpoint)
6. [UI Component Specifications](#6-ui-component-specifications)
7. [API Specifications](#7-api-specifications)
8. [Error Handling and Edge Cases](#8-error-handling-and-edge-cases)
9. [Performance and Scalability](#9-performance-and-scalability)
10. [Security Considerations](#10-security-considerations)
11. [Implementation Phases](#11-implementation-phases)
12. [Testing Strategy](#12-testing-strategy)

---

## 1. System Overview

### 1.1 Purpose

Unmute AI v2 extends the existing citation-grounded writing platform with four major
subsystems that close the gap between "citation inserted" and "citation verified against
source material":

1. **Evidence Mapping System** -- Maps each manuscript claim to a specific passage in the
   cited paper, with PDF screenshots and human verification workflow.
2. **Paragraph Flow Analysis** -- Analyzes logical structure of paragraphs within each
   section, identifies role mismatches, missing bridges, and structural issues.
3. **Guideline Compliance Checker** -- Validates manuscript against reporting guidelines
   (CONSORT-AI, TRIPOD+AI, STARD-AI, CLAIM, GAMER).
4. **Evidence Export** -- Generates PowerPoint slides documenting the claim-to-evidence
   chain for supervisor review, ethics boards, or audit trails.

### 1.2 Relationship to Existing System

v2 builds on top of the existing v1 evidence stack without replacing it:

| v1 Component | v2 Extension |
|---|---|
| `CanonicalPaper` + `PaperIdentifier` | Extended with `PdfCache` for full-text PDF storage |
| `EvidenceSnippet` + `ClaimCard` | Extended with `EvidenceMapping` for claim-to-passage linking |
| `ManuscriptCitation` + `ManuscriptCitationAnchor` | Consumed by evidence mapping as input anchors |
| `ManuscriptClaim` + `ManuscriptClaimSupport` | Decomposed claims feed into mapping pipeline |
| `ReviewFinding` | Extended with flow analysis and compliance findings |
| `fulltext-resolver.ts` (PMC, S2ORC, arXiv, Unpaywall, CORE) | Extended with PDF download and page-level parsing |
| `extract-evidence.ts` | Reused for snippet extraction; mapping adds passage-level precision |
| `claim-compiler.ts` | Reused for sentence decomposition; flow analysis adds paragraph-level roles |
| `adversarial-review.ts` | Extended with compliance-aware review rules |
| `grounded-writer.ts` | Unchanged; evidence mappings provide verification after writing |
| Export pipeline (LaTeX, Word, BibTeX) | Extended with PPTX evidence export |

### 1.3 Technology Stack Additions

| Concern | Technology | Justification |
|---|---|---|
| PDF parsing | `pdf-parse` (npm) | Extract text + page boundaries from downloaded PDFs |
| PDF rendering | `pdf.js` (pdfjs-dist) | Client-side page rendering for screenshot generation |
| Screenshot capture | Canvas API + `sharp` | Server-side region capture and image optimization |
| Object storage | Vercel Blob / GCS | Store PDF files and screenshot images |
| PPTX generation | `pptxgenjs` (npm) | Generate PowerPoint files server-side |
| AI model | Gemini 2.5 Flash (existing) | All LLM tasks use the existing `translationModel` |

### 1.4 Key Design Decisions

1. **PDF-first, text-fallback**: The mapping pipeline prefers PDF download for screenshot
   generation, but falls back to text-only mapping when PDFs are unavailable (paywalled,
   missing). Text-only mappings are clearly marked as "no screenshot available."

2. **Async pipeline with status tracking**: Evidence mapping is computationally expensive
   (PDF download + LLM passage matching + screenshot generation). The pipeline runs
   asynchronously via `AgentRun` with status updates. The UI polls or uses SSE for progress.

3. **Human-in-the-loop verification**: All evidence mappings start as `humanVerified: false`.
   The system never claims a mapping is "confirmed" without explicit human action. This is
   critical for medical AI research where evidence integrity matters.

4. **Incremental mapping**: Users can map citations one at a time or batch-map all citations
   in a section. The pipeline is idempotent -- re-running on an already-mapped citation
   updates the existing mapping rather than creating duplicates.

---

## 2. Evidence Mapping System

### 2.1 Data Model

#### 2.1.1 New Models

```prisma
// ===== Evidence Mapping System (v2) =====

model EvidenceMapping {
  id                    String   @id @default(cuid())
  documentId            String
  manuscriptCitationId  String
  manuscriptSentence    String   @db.Text
  sentenceIndex         Int
  sectionType           String?               // "INTRODUCTION" | "METHODS" | "RESULTS" | "DISCUSSION"

  // Mapping to cited paper
  supportingPassage     String   @db.Text
  citedPaperSection     String?               // Section heading in cited paper
  citedPaperPage        Int?                  // 1-indexed page number in PDF
  confidence            Float                 // 0.0-1.0
  mappingRationale      String?  @db.Text     // LLM explanation of why this passage supports the claim

  // PDF screenshot
  screenshotUrl         String?               // URL in object storage
  screenshotCoords      Json?                 // { x: number, y: number, width: number, height: number, page: number }

  // Human verification
  humanVerified         Boolean  @default(false)
  verifiedBy            String?               // User.id
  verifiedAt            DateTime?
  verificationNote      String?  @db.Text
  verificationStatus    String   @default("pending") // "pending" | "verified" | "rejected" | "needs_revision"

  // Relations
  document              Document            @relation(fields: [documentId], references: [id], onDelete: Cascade)
  manuscriptCitation    ManuscriptCitation  @relation(fields: [manuscriptCitationId], references: [id], onDelete: Cascade)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([documentId, manuscriptCitationId, sentenceIndex])
  @@index([documentId])
  @@index([manuscriptCitationId])
  @@index([documentId, verificationStatus])
}

model PdfCache {
  id          String   @id @default(cuid())
  paperId     String   @unique
  doi         String?
  pdfUrl      String                          // Original PDF source URL
  storedPath  String                          // Path in object storage (e.g., "pdfs/{paperId}.pdf")
  pageCount   Int?
  fileSize    Int?                             // Bytes
  parsedText  Json?                            // { pages: [{ pageNumber: number, text: string, sections: [{ heading: string, startChar: number, endChar: number }] }] }
  status      String   @default("pending")    // "pending" | "downloading" | "downloaded" | "parsed" | "failed"
  failReason  String?                          // Error message if status = "failed"

  paper       CanonicalPaper @relation(fields: [paperId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
}
```

#### 2.1.2 Schema Changes to Existing Models

```prisma
// Add to Document model:
model Document {
  // ... existing fields ...
  evidenceMappings     EvidenceMapping[]
  paragraphAnalyses    ParagraphAnalysis[]
  complianceReports    ComplianceReport[]
}

// Add to ManuscriptCitation model:
model ManuscriptCitation {
  // ... existing fields ...
  evidenceMappings     EvidenceMapping[]
}

// Add to CanonicalPaper model:
model CanonicalPaper {
  // ... existing fields ...
  pdfCache             PdfCache?
}
```

#### 2.1.3 PdfCache.parsedText Schema

The `parsedText` JSON field stores structured text extracted from the PDF:

```typescript
interface ParsedPdfText {
  pages: ParsedPage[];
  totalCharCount: number;
  extractionMethod: "pdf-parse" | "pmc-xml" | "manual";
}

interface ParsedPage {
  pageNumber: number;        // 1-indexed
  text: string;              // Full text of the page
  sections: ParsedSection[]; // Detected section boundaries on this page
}

interface ParsedSection {
  heading: string;
  startChar: number;         // Relative to page text
  endChar: number;           // Relative to page text
  sectionType?: string;      // "INTRODUCTION" | "METHODS" | "RESULTS" | "DISCUSSION" | "OTHER"
}
```

### 2.2 Evidence Mapping Pipeline

The pipeline consists of five sequential steps, orchestrated by a single `AgentRun` record.

#### 2.2.1 Pipeline Overview

```
Input: documentId + manuscriptCitationId + sentenceIndex + manuscriptSentence

Step 1: Claim Decomposition
  |
Step 2: Cited Paper Full-Text Retrieval + PDF Cache
  |
Step 3: Passage Matching (Gemini)
  |
Step 4: PDF Screenshot Generation
  |
Step 5: Store EvidenceMapping

Output: EvidenceMapping record with screenshot
```

#### 2.2.2 Step 1: Claim Decomposition

Reuses the existing `claim-compiler.ts` decomposition logic.

```typescript
// src/lib/evidence/mapping/decompose-claim.ts

import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";

interface DecomposedClaim {
  atomicClaims: string[];
  claimType: "factual" | "methodological" | "statistical" | "comparative";
  searchTerms: string[];   // Key terms for passage matching
}

const claimDecompositionSchema = z.object({
  atomicClaims: z.array(z.string()).describe(
    "Break the sentence into independent atomic claims that each need evidence support"
  ),
  claimType: z.enum(["factual", "methodological", "statistical", "comparative"]),
  searchTerms: z.array(z.string()).describe(
    "Key technical terms and concepts to search for in the cited paper"
  ),
});

export async function decomposeClaim(
  manuscriptSentence: string,
  sectionType: string,
): Promise<DecomposedClaim> {
  const { object } = await generateObject({
    model: translationModel,
    schema: claimDecompositionSchema,
    system: `You are an academic claim decomposition expert specializing in medical AI research.

Given a sentence from the ${sectionType} section of a manuscript, break it into atomic claims.

Rules:
- Each atomic claim should be independently verifiable against a single source
- Remove hedging language to expose the core assertion
- Identify the type: factual (states a fact), methodological (describes a technique),
  statistical (cites numbers), comparative (compares approaches)
- Extract key technical terms that would appear in a supporting passage`,
    prompt: manuscriptSentence,
  });

  return object;
}
```

#### 2.2.3 Step 2: Cited Paper Full-Text Retrieval

Extends the existing `fulltext-resolver.ts` with PDF download and caching.

```typescript
// src/lib/evidence/mapping/pdf-retriever.ts

import { prisma } from "@/lib/prisma";
import { resolveFullText } from "@/lib/providers/fulltext-resolver";
import type { ParsedPdfText } from "./types";

interface PdfRetrievalResult {
  fullText: string;
  sections: { heading: string; text: string; pageStart?: number; pageEnd?: number }[];
  pdfPath: string | null;     // Path in object storage, null if no PDF available
  pdfCacheId: string | null;
  source: "pdf" | "pmc-xml" | "text-only";
}

const PDF_SOURCE_PRIORITIES = [
  "pmc",         // PMC has free PDFs for OA papers
  "unpaywall",   // Unpaywall finds OA copies
  "arxiv",       // arXiv papers always have PDFs
  "core",        // CORE provides OA PDFs
] as const;

export async function retrieveCitedPaperContent(
  paperId: string,
): Promise<PdfRetrievalResult> {
  // 1. Check PdfCache for existing parsed PDF
  const existingCache = await prisma.pdfCache.findUnique({
    where: { paperId },
  });

  if (existingCache?.status === "parsed" && existingCache.parsedText) {
    const parsed = existingCache.parsedText as ParsedPdfText;
    return {
      fullText: parsed.pages.map((p) => p.text).join("\n\n"),
      sections: extractSectionsFromParsed(parsed),
      pdfPath: existingCache.storedPath,
      pdfCacheId: existingCache.id,
      source: "pdf",
    };
  }

  // 2. Fetch paper identifiers
  const paper = await prisma.canonicalPaper.findUnique({
    where: { id: paperId },
    include: { identifiers: true },
  });
  if (!paper) throw new Error(`Paper not found: ${paperId}`);

  const identifiers = buildIdentifiers(paper.identifiers);

  // 3. Try PDF download
  const pdfResult = await tryDownloadPdf(paperId, identifiers);
  if (pdfResult) {
    return {
      fullText: pdfResult.fullText,
      sections: pdfResult.sections,
      pdfPath: pdfResult.storedPath,
      pdfCacheId: pdfResult.cacheId,
      source: "pdf",
    };
  }

  // 4. Fallback: use existing fulltext-resolver (text only, no PDF)
  const textResult = await resolveFullText(identifiers);
  if (textResult) {
    return {
      fullText: textResult.sections.map((s) => s.text).join("\n\n"),
      sections: textResult.sections.map((s) => ({
        heading: s.heading,
        text: s.text,
      })),
      pdfPath: null,
      pdfCacheId: null,
      source: textResult.source === "pmc" ? "pmc-xml" : "text-only",
    };
  }

  // 5. Last resort: use abstract
  if (paper.abstract) {
    return {
      fullText: paper.abstract,
      sections: [{ heading: "Abstract", text: paper.abstract }],
      pdfPath: null,
      pdfCacheId: null,
      source: "text-only",
    };
  }

  throw new Error(`No content available for paper: ${paperId}`);
}

async function tryDownloadPdf(
  paperId: string,
  identifiers: Record<string, string | undefined>,
): Promise<{
  fullText: string;
  sections: { heading: string; text: string; pageStart?: number; pageEnd?: number }[];
  storedPath: string;
  cacheId: string;
} | null> {
  // Attempt PDF URL resolution from multiple sources
  const pdfUrl = await resolvePdfUrl(identifiers);
  if (!pdfUrl) return null;

  // Create or update PdfCache record
  const cache = await prisma.pdfCache.upsert({
    where: { paperId },
    create: {
      paperId,
      doi: identifiers.doi,
      pdfUrl,
      storedPath: `pdfs/${paperId}.pdf`,
      status: "downloading",
    },
    update: {
      pdfUrl,
      status: "downloading",
    },
  });

  try {
    // Download PDF to object storage
    const pdfBuffer = await downloadPdf(pdfUrl);
    await uploadToStorage(cache.storedPath, pdfBuffer);

    // Parse PDF text
    const parsed = await parsePdfContent(pdfBuffer);

    // Update cache with parsed content
    await prisma.pdfCache.update({
      where: { id: cache.id },
      data: {
        status: "parsed",
        pageCount: parsed.pages.length,
        fileSize: pdfBuffer.length,
        parsedText: parsed as object,
      },
    });

    return {
      fullText: parsed.pages.map((p) => p.text).join("\n\n"),
      sections: extractSectionsFromParsed(parsed),
      storedPath: cache.storedPath,
      cacheId: cache.id,
    };
  } catch (error) {
    await prisma.pdfCache.update({
      where: { id: cache.id },
      data: {
        status: "failed",
        failReason: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return null;
  }
}

async function resolvePdfUrl(
  identifiers: Record<string, string | undefined>,
): Promise<string | null> {
  // Priority 1: arXiv PDF (always available)
  if (identifiers.arxivId) {
    return `https://arxiv.org/pdf/${identifiers.arxivId}.pdf`;
  }

  // Priority 2: PMC PDF
  if (identifiers.pmcid) {
    return `https://www.ncbi.nlm.nih.gov/pmc/articles/${identifiers.pmcid}/pdf/`;
  }

  // Priority 3: Unpaywall OA PDF
  if (identifiers.doi) {
    try {
      const res = await fetch(
        `https://api.unpaywall.org/v2/${identifiers.doi}?email=support@unmute-ai.com`
      );
      if (res.ok) {
        const data = await res.json();
        const bestOa = data.best_oa_location;
        if (bestOa?.url_for_pdf) return bestOa.url_for_pdf;
      }
    } catch {
      // Unpaywall unavailable, continue
    }
  }

  return null;
}

function buildIdentifiers(
  dbIdentifiers: { provider: string; externalId: string }[],
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const id of dbIdentifiers) {
    if (id.provider === "crossref") result.doi = id.externalId;
    if (id.provider === "pubmed") result.pmid = id.externalId;
    if (id.provider === "pmc") result.pmcid = id.externalId;
    if (id.provider === "arxiv") result.arxivId = id.externalId;
  }
  return result;
}

function extractSectionsFromParsed(
  parsed: ParsedPdfText,
): { heading: string; text: string; pageStart?: number; pageEnd?: number }[] {
  // Group sections across pages
  const sections: { heading: string; text: string; pageStart: number; pageEnd: number }[] = [];
  let currentSection: { heading: string; texts: string[]; pageStart: number; pageEnd: number } | null = null;

  for (const page of parsed.pages) {
    for (const section of page.sections) {
      if (currentSection && currentSection.heading !== section.heading) {
        sections.push({
          heading: currentSection.heading,
          text: currentSection.texts.join("\n"),
          pageStart: currentSection.pageStart,
          pageEnd: currentSection.pageEnd,
        });
        currentSection = null;
      }

      if (!currentSection) {
        currentSection = {
          heading: section.heading,
          texts: [page.text.slice(section.startChar, section.endChar)],
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
        };
      } else {
        currentSection.texts.push(page.text.slice(section.startChar, section.endChar));
        currentSection.pageEnd = page.pageNumber;
      }
    }
  }

  if (currentSection) {
    sections.push({
      heading: currentSection.heading,
      text: currentSection.texts.join("\n"),
      pageStart: currentSection.pageStart,
      pageEnd: currentSection.pageEnd,
    });
  }

  return sections;
}
```

#### 2.2.4 Step 3: Passage Matching (Gemini)

The core intelligence of the mapping system. Uses Gemini to find the exact passage in the
cited paper that supports the manuscript claim.

```typescript
// src/lib/evidence/mapping/passage-matcher.ts

import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";

interface PassageMatchInput {
  atomicClaims: string[];
  claimType: string;
  searchTerms: string[];
  citedPaperSections: {
    heading: string;
    text: string;
    pageStart?: number;
    pageEnd?: number;
  }[];
  paperTitle: string;
  paperYear?: number;
}

interface PassageMatchResult {
  supportingPassage: string;      // Exact quoted text from the cited paper
  citedPaperSection: string;      // Section heading where passage was found
  citedPaperPage: number | null;  // Approximate page number
  confidence: number;             // 0.0-1.0
  mappingRationale: string;       // Explanation of why this passage supports the claim
  matchType: "direct_quote" | "paraphrase_match" | "semantic_match" | "no_match";
  alternativePassages: {          // Up to 2 alternative matches
    passage: string;
    section: string;
    confidence: number;
  }[];
}

const passageMatchSchema = z.object({
  primaryMatch: z.object({
    supportingPassage: z.string().describe(
      "The exact verbatim text from the cited paper that supports the claim. " +
      "Quote the passage precisely as it appears, including any numbers or statistics."
    ),
    sectionHeading: z.string().describe("The section heading where this passage was found"),
    approximatePage: z.number().nullable().describe("Approximate page number (1-indexed), or null if unknown"),
    confidence: z.number().min(0).max(1).describe(
      "Confidence that this passage genuinely supports the claim. " +
      "0.9+ = direct statement of the claim. " +
      "0.7-0.89 = strong but indirect support. " +
      "0.5-0.69 = partial support, claim overstates evidence. " +
      "Below 0.5 = weak or tangential."
    ),
    rationale: z.string().describe(
      "2-3 sentence explanation of how the passage supports the manuscript claim. " +
      "Note any discrepancies between the claim and the evidence."
    ),
    matchType: z.enum(["direct_quote", "paraphrase_match", "semantic_match", "no_match"]),
  }),
  alternativeMatches: z.array(z.object({
    passage: z.string(),
    sectionHeading: z.string(),
    confidence: z.number().min(0).max(1),
  })).max(2).describe("Up to 2 alternative passages that also support the claim"),
  warnings: z.array(z.string()).describe(
    "Any concerns: claim overstatement, missing context, potential misattribution"
  ),
});

export async function matchPassage(
  input: PassageMatchInput,
): Promise<PassageMatchResult> {
  const sectionTexts = input.citedPaperSections
    .map((s, i) => {
      const pageInfo = s.pageStart ? ` (pages ${s.pageStart}-${s.pageEnd ?? s.pageStart})` : "";
      return `--- Section ${i + 1}: ${s.heading}${pageInfo} ---\n${s.text}`;
    })
    .join("\n\n");

  const claimDescription = input.atomicClaims.length === 1
    ? `Claim: "${input.atomicClaims[0]}"`
    : `Claims:\n${input.atomicClaims.map((c, i) => `${i + 1}. "${c}"`).join("\n")}`;

  const { object } = await generateObject({
    model: translationModel,
    schema: passageMatchSchema,
    system: `You are an expert academic evidence verifier specializing in medical AI research papers.

TASK: Given a claim from a manuscript and the full text of a cited paper, find the specific
passage in the cited paper that supports this claim.

CRITICAL RULES:
1. The supporting passage MUST be a verbatim quote from the cited paper text provided below.
   Do NOT paraphrase or summarize -- quote the exact text.
2. If the claim cites a specific number (e.g., "95% accuracy"), the supporting passage MUST
   contain that number or a closely matching one.
3. If the claim makes a causal assertion (e.g., "X causes Y"), verify that the cited paper
   actually makes that causal claim, not merely a correlation.
4. If the paper does not actually support the claim, set matchType to "no_match" and
   confidence below 0.3. It is better to report no match than to force a weak one.
5. Pay attention to the difference between the paper's own findings vs. claims the paper
   makes about other work. The supporting passage should be the paper's own statement.

CONFIDENCE CALIBRATION for medical AI:
- 0.95-1.0: The passage directly and unambiguously states what the manuscript claims
- 0.85-0.94: The passage clearly supports the claim with minor wording differences
- 0.70-0.84: The passage supports the claim but the manuscript adds interpretation
- 0.50-0.69: Partial support only; the claim overstates or extrapolates
- 0.30-0.49: Tangential -- the passage is related but does not actually support the claim
- 0.00-0.29: No real support found; the claim may be misattributed

Paper: "${input.paperTitle}" (${input.paperYear ?? "n.d."})
Claim type: ${input.claimType}
Key search terms: ${input.searchTerms.join(", ")}`,
    prompt: `${claimDescription}

CITED PAPER FULL TEXT:
${sectionTexts}`,
  });

  return {
    supportingPassage: object.primaryMatch.supportingPassage,
    citedPaperSection: object.primaryMatch.sectionHeading,
    citedPaperPage: object.primaryMatch.approximatePage,
    confidence: object.primaryMatch.confidence,
    mappingRationale: object.primaryMatch.rationale,
    matchType: object.primaryMatch.matchType,
    alternativePassages: object.alternativeMatches.map((m) => ({
      passage: m.passage,
      section: m.sectionHeading,
      confidence: m.confidence,
    })),
  };
}
```

#### 2.2.5 Step 4: PDF Screenshot Generation

Generates a cropped screenshot of the relevant passage in the PDF.

```typescript
// src/lib/evidence/mapping/screenshot-generator.ts

interface ScreenshotInput {
  pdfPath: string;           // Path in object storage
  pageNumber: number;        // 1-indexed
  searchText: string;        // Text to find and highlight
}

interface ScreenshotResult {
  screenshotUrl: string;     // URL of uploaded screenshot
  coords: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
}

interface TextPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Generate a screenshot of a specific passage in a PDF.
 *
 * Process:
 * 1. Load PDF page from object storage
 * 2. Search for the target text on the page
 * 3. Calculate bounding box with padding
 * 4. Render the region to a PNG image
 * 5. Upload to object storage
 * 6. Return URL and coordinates
 *
 * Uses pdfjs-dist for text search and canvas rendering,
 * and sharp for image optimization.
 */
export async function generateScreenshot(
  input: ScreenshotInput,
): Promise<ScreenshotResult | null> {
  // 1. Download PDF from object storage
  const pdfBuffer = await downloadFromStorage(input.pdfPath);

  // 2. Load PDF with pdf.js
  const pdfDoc = await loadPdfDocument(pdfBuffer);
  const page = await pdfDoc.getPage(input.pageNumber);

  // 3. Get text content and find matching text
  const textContent = await page.getTextContent();
  const matchPosition = findTextPosition(textContent, input.searchText);

  if (!matchPosition) {
    // Try adjacent pages if text not found on expected page
    for (const offset of [-1, 1]) {
      const adjacentPageNum = input.pageNumber + offset;
      if (adjacentPageNum < 1 || adjacentPageNum > pdfDoc.numPages) continue;

      const adjacentPage = await pdfDoc.getPage(adjacentPageNum);
      const adjacentText = await adjacentPage.getTextContent();
      const adjacentMatch = findTextPosition(adjacentText, input.searchText);

      if (adjacentMatch) {
        return await renderAndUpload(adjacentPage, adjacentMatch, input.pdfPath, adjacentPageNum);
      }
    }
    return null; // Text not found on any nearby page
  }

  return await renderAndUpload(page, matchPosition, input.pdfPath, input.pageNumber);
}

/**
 * Find text position using normalized substring matching.
 * Handles line breaks, hyphenation, and whitespace variations.
 */
function findTextPosition(
  textContent: { items: Array<{ str: string; transform: number[]; width: number; height: number }> },
  searchText: string,
): TextPosition | null {
  // Normalize search text: collapse whitespace, remove hyphens at line breaks
  const normalizedSearch = searchText
    .replace(/\s+/g, " ")
    .replace(/-\s+/g, "")
    .trim()
    .toLowerCase();

  // Take first 80 characters for matching (long passages may span columns)
  const searchPrefix = normalizedSearch.slice(0, 80);

  // Build concatenated text with position tracking
  let fullText = "";
  const charPositions: { itemIndex: number; charInItem: number }[] = [];

  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i];
    for (let j = 0; j < item.str.length; j++) {
      charPositions.push({ itemIndex: i, charInItem: j });
      fullText += item.str[j];
    }
    // Add space between items
    charPositions.push({ itemIndex: i, charInItem: item.str.length });
    fullText += " ";
  }

  const normalizedFull = fullText.toLowerCase().replace(/\s+/g, " ");
  const matchIndex = normalizedFull.indexOf(searchPrefix);

  if (matchIndex === -1) return null;

  // Calculate bounding box from matched character positions
  const startPos = charPositions[matchIndex];
  const endCharIndex = Math.min(matchIndex + searchPrefix.length, charPositions.length - 1);
  const endPos = charPositions[endCharIndex];

  if (!startPos || !endPos) return null;

  const startItem = textContent.items[startPos.itemIndex];
  const endItem = textContent.items[endPos.itemIndex];

  const PADDING = 20; // pixels of padding around the match

  return {
    x: Math.max(0, startItem.transform[4] - PADDING),
    y: Math.max(0, Math.min(startItem.transform[5], endItem.transform[5]) - PADDING),
    width: Math.abs(endItem.transform[4] + endItem.width - startItem.transform[4]) + PADDING * 2,
    height: Math.abs(endItem.transform[5] - startItem.transform[5]) + startItem.height + PADDING * 2,
  };
}

async function renderAndUpload(
  page: PDFPageProxy,
  position: TextPosition,
  pdfPath: string,
  pageNumber: number,
): Promise<ScreenshotResult> {
  const SCALE = 2.0; // 2x for retina quality
  const viewport = page.getViewport({ scale: SCALE });

  // Render full page to canvas
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Crop to region of interest
  const scaledCoords = {
    x: Math.round(position.x * SCALE),
    y: Math.round((viewport.height / SCALE - position.y - position.height) * SCALE),
    width: Math.round(position.width * SCALE),
    height: Math.round(position.height * SCALE),
  };

  // Use sharp to crop and optimize
  const fullImage = canvas.toBuffer("image/png");
  const croppedImage = await sharp(fullImage)
    .extract({
      left: Math.max(0, scaledCoords.x),
      top: Math.max(0, scaledCoords.y),
      width: Math.min(scaledCoords.width, viewport.width - scaledCoords.x),
      height: Math.min(scaledCoords.height, viewport.height - scaledCoords.y),
    })
    .png({ quality: 90 })
    .toBuffer();

  // Upload to object storage
  const screenshotPath = `screenshots/${pdfPath.replace("pdfs/", "").replace(".pdf", "")}` +
    `_p${pageNumber}_${Date.now()}.png`;
  const screenshotUrl = await uploadToStorage(screenshotPath, croppedImage);

  return {
    screenshotUrl,
    coords: {
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      page: pageNumber,
    },
  };
}
```

#### 2.2.6 Step 5: Pipeline Orchestrator

Coordinates all steps and manages the `AgentRun` lifecycle.

```typescript
// src/lib/evidence/mapping/map-evidence.ts

import { prisma } from "@/lib/prisma";
import { decomposeClaim } from "./decompose-claim";
import { retrieveCitedPaperContent } from "./pdf-retriever";
import { matchPassage } from "./passage-matcher";
import { generateScreenshot } from "./screenshot-generator";

interface MapEvidenceInput {
  documentId: string;
  manuscriptCitationId: string;
  sentenceIndex: number;
  manuscriptSentence: string;
}

interface MapEvidenceResult {
  mappingId: string;
  supportingPassage: string;
  citedPaperSection: string | null;
  citedPaperPage: number | null;
  confidence: number;
  mappingRationale: string;
  screenshotUrl: string | null;
  matchType: string;
  warnings: string[];
}

export async function mapEvidence(
  input: MapEvidenceInput,
): Promise<MapEvidenceResult> {
  const { documentId, manuscriptCitationId, sentenceIndex, manuscriptSentence } = input;

  // Fetch the manuscript citation with paper details
  const citation = await prisma.manuscriptCitation.findUnique({
    where: { id: manuscriptCitationId },
    include: {
      paper: { include: { identifiers: true } },
    },
  });
  if (!citation) throw new Error(`ManuscriptCitation not found: ${manuscriptCitationId}`);

  // Create AgentRun for tracking
  const agentRun = await prisma.agentRun.create({
    data: {
      documentId,
      agentType: "evidence_mapping",
      status: "running",
      input: {
        manuscriptCitationId,
        sentenceIndex,
        manuscriptSentence,
        paperId: citation.paperId,
      } as object,
      startedAt: new Date(),
    },
  });

  const warnings: string[] = [];

  try {
    // Step 1: Decompose claim
    const decomposed = await decomposeClaim(
      manuscriptSentence,
      citation.sectionType ?? "OTHER",
    );

    // Step 2: Retrieve cited paper content
    const paperContent = await retrieveCitedPaperContent(citation.paperId);

    if (paperContent.source === "text-only") {
      warnings.push("Full-text PDF not available. Mapping based on abstract/extracted text only.");
    }

    // Step 3: Match passage
    const matchResult = await matchPassage({
      atomicClaims: decomposed.atomicClaims,
      claimType: decomposed.claimType,
      searchTerms: decomposed.searchTerms,
      citedPaperSections: paperContent.sections,
      paperTitle: citation.paper.title,
      paperYear: citation.paper.year ?? undefined,
    });

    if (matchResult.matchType === "no_match") {
      warnings.push(
        "No supporting passage found in the cited paper. " +
        "The citation may be misattributed or the claim may overstate the source."
      );
    }

    // Step 4: Generate screenshot (only if PDF available and passage found)
    let screenshotUrl: string | null = null;
    let screenshotCoords: object | null = null;

    if (
      paperContent.pdfPath &&
      matchResult.citedPaperPage &&
      matchResult.matchType !== "no_match"
    ) {
      const screenshot = await generateScreenshot({
        pdfPath: paperContent.pdfPath,
        pageNumber: matchResult.citedPaperPage,
        searchText: matchResult.supportingPassage.slice(0, 200),
      });

      if (screenshot) {
        screenshotUrl = screenshot.screenshotUrl;
        screenshotCoords = screenshot.coords;
      } else {
        warnings.push("Screenshot generation failed. The passage position could not be located in the PDF.");
      }
    } else if (!paperContent.pdfPath) {
      warnings.push("No PDF available for screenshot generation.");
    }

    // Step 5: Store EvidenceMapping (upsert for idempotency)
    const mapping = await prisma.evidenceMapping.upsert({
      where: {
        documentId_manuscriptCitationId_sentenceIndex: {
          documentId,
          manuscriptCitationId,
          sentenceIndex,
        },
      },
      create: {
        documentId,
        manuscriptCitationId,
        manuscriptSentence,
        sentenceIndex,
        sectionType: citation.sectionType,
        supportingPassage: matchResult.supportingPassage,
        citedPaperSection: matchResult.citedPaperSection,
        citedPaperPage: matchResult.citedPaperPage,
        confidence: matchResult.confidence,
        mappingRationale: matchResult.mappingRationale,
        screenshotUrl,
        screenshotCoords: screenshotCoords as object | undefined,
        humanVerified: false,
        verificationStatus: "pending",
      },
      update: {
        manuscriptSentence,
        sectionType: citation.sectionType,
        supportingPassage: matchResult.supportingPassage,
        citedPaperSection: matchResult.citedPaperSection,
        citedPaperPage: matchResult.citedPaperPage,
        confidence: matchResult.confidence,
        mappingRationale: matchResult.mappingRationale,
        screenshotUrl,
        screenshotCoords: screenshotCoords as object | undefined,
        humanVerified: false,
        verificationStatus: "pending",
        verifiedBy: null,
        verifiedAt: null,
        verificationNote: null,
      },
    });

    // Update AgentRun
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "completed",
        output: {
          mappingId: mapping.id,
          confidence: matchResult.confidence,
          matchType: matchResult.matchType,
          hasScreenshot: !!screenshotUrl,
          warnings,
        } as object,
        completedAt: new Date(),
      },
    });

    return {
      mappingId: mapping.id,
      supportingPassage: matchResult.supportingPassage,
      citedPaperSection: matchResult.citedPaperSection,
      citedPaperPage: matchResult.citedPaperPage,
      confidence: matchResult.confidence,
      mappingRationale: matchResult.mappingRationale,
      screenshotUrl,
      matchType: matchResult.matchType,
      warnings,
    };
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
```

### 2.3 Batch Mapping

Maps all citations in a document or section at once.

```typescript
// src/lib/evidence/mapping/batch-map.ts

interface BatchMapInput {
  documentId: string;
  sectionType?: string;   // Optional: limit to a specific section
  skipExisting?: boolean;  // Skip citations that already have mappings
}

interface BatchMapProgress {
  total: number;
  completed: number;
  failed: number;
  current: string | null;  // Current paper being processed
}

/**
 * Batch-map all citations in a document.
 *
 * Steps:
 * 1. Fetch all ManuscriptCitations (with anchors) for the document
 * 2. For each citation-sentence pair, call mapEvidence
 * 3. Track progress via AgentRun updates
 * 4. Return summary of results
 *
 * Concurrency: Process at most 3 citations in parallel to avoid
 * overwhelming the Gemini API rate limit.
 */
export async function batchMapEvidence(
  input: BatchMapInput,
): Promise<{
  agentRunId: string;
  results: { mappingId: string; paperId: string; confidence: number; status: string }[];
  summary: { total: number; mapped: number; failed: number; noMatch: number };
}> {
  // Implementation follows the same pattern as mapEvidence
  // but with parallel processing and progress tracking
  // ...
}
```

### 2.4 Human Verification Workflow

#### 2.4.1 Verification States

```
pending ──> verified    (human confirms mapping is correct)
   |
   └──> rejected       (human rejects: wrong passage, wrong paper, etc.)
   |
   └──> needs_revision (human flags issues but doesn't fully reject)
```

#### 2.4.2 Verification Rules

1. Only authenticated users can verify mappings for documents they own.
2. Verification sets `verifiedBy`, `verifiedAt`, and optionally `verificationNote`.
3. Verification is reversible -- a user can change status back to `pending`.
4. Re-running the mapping pipeline on a verified mapping resets it to `pending`
   and adds a warning that human verification needs to be re-done.
5. Export (PPTX) clearly marks whether each mapping is human-verified or not.

---

## 3. Paragraph Flow Analysis System

### 3.1 Data Model

```prisma
model ParagraphAnalysis {
  id              String   @id @default(cuid())
  documentId      String
  versionNumber   Int
  sectionType     String?                    // "INTRODUCTION" | "METHODS" | etc.

  analysis        Json                       // ParagraphFlowResult (see below)
  overallScore    Int?                       // 0-100 overall quality score
  issueCount      Int      @default(0)       // Number of issues found

  document        Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  createdAt       DateTime @default(now())

  @@index([documentId])
  @@index([documentId, sectionType])
}
```

### 3.2 Analysis Types

```typescript
// src/lib/evidence/flow/types.ts

type ParagraphRoleType =
  | "background"
  | "problem"
  | "prior_work"
  | "gap"
  | "approach"
  | "contribution"
  | "result"
  | "interpretation"
  | "limitation"
  | "transition"
  | "other";

interface ParagraphRole {
  index: number;
  textPreview: string;          // First 200 characters
  role: ParagraphRoleType;
  topics: string[];             // Key topics discussed in this paragraph
  confidence: number;           // 0.0-1.0 confidence in role assignment
  transitionQuality: number;    // 0.0-1.0 quality of transition from previous paragraph
  transitionNote: string;       // Description of how this connects to previous paragraph
}

type FlowIssueType =
  | "topic_shift"
  | "missing_bridge"
  | "redundant"
  | "wrong_section"
  | "missing_literature"
  | "logical_gap"
  | "role_sequence"
  | "overlong_paragraph";

interface FlowIssue {
  type: FlowIssueType;
  paragraphIndex: number;
  severity: "high" | "medium" | "low";
  description: string;
  suggestion: string;
  missingTopics?: string[];       // For "missing_literature" type
  relatedParagraph?: number;      // For "topic_shift" and "redundant" types
  expectedRole?: ParagraphRoleType; // For "role_sequence" type
}

interface ParagraphFlowResult {
  paragraphs: ParagraphRole[];
  issues: FlowIssue[];
  overallScore: number;           // 0-100
  sectionSummary: string;         // 1-2 sentence summary of section quality
  roleSequence: string;           // e.g., "background -> problem -> prior_work -> gap -> approach"
  expectedSequence: string;       // e.g., "background -> problem -> prior_work -> gap -> contribution"
}
```

### 3.3 Analysis Pipeline

```typescript
// src/lib/evidence/flow/analyze-flow.ts

import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";
import type { ParagraphFlowResult } from "./types";

interface AnalyzeFlowInput {
  sectionType: string;
  paragraphs: string[];
  researchTopic?: string;
  resultsSummary?: string;
}

const EXPECTED_ROLE_SEQUENCES: Record<string, string[]> = {
  INTRODUCTION: ["background", "problem", "prior_work", "gap", "approach", "contribution"],
  METHODS: ["approach", "prior_work", "contribution", "result"],
  RESULTS: ["result", "interpretation", "result", "interpretation"],
  DISCUSSION: ["interpretation", "prior_work", "limitation", "contribution"],
};

const flowAnalysisSchema = z.object({
  paragraphs: z.array(z.object({
    index: z.number(),
    role: z.enum([
      "background", "problem", "prior_work", "gap", "approach",
      "contribution", "result", "interpretation", "limitation",
      "transition", "other",
    ]),
    topics: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    transitionQuality: z.number().min(0).max(1),
    transitionNote: z.string(),
  })),
  issues: z.array(z.object({
    type: z.enum([
      "topic_shift", "missing_bridge", "redundant", "wrong_section",
      "missing_literature", "logical_gap", "role_sequence", "overlong_paragraph",
    ]),
    paragraphIndex: z.number(),
    severity: z.enum(["high", "medium", "low"]),
    description: z.string(),
    suggestion: z.string(),
    missingTopics: z.array(z.string()).optional(),
    relatedParagraph: z.number().optional(),
    expectedRole: z.string().optional(),
  })),
  overallScore: z.number().min(0).max(100),
  sectionSummary: z.string(),
});

export async function analyzeFlow(
  input: AnalyzeFlowInput,
): Promise<ParagraphFlowResult> {
  const { sectionType, paragraphs, researchTopic, resultsSummary } = input;

  const numberedParagraphs = paragraphs
    .map((p, i) => `[Paragraph ${i}]\n${p}`)
    .join("\n\n---\n\n");

  const expectedSequence = EXPECTED_ROLE_SEQUENCES[sectionType] ?? [];

  const { object } = await generateObject({
    model: translationModel,
    schema: flowAnalysisSchema,
    system: `You are an expert academic writing coach analyzing the logical flow of a
${sectionType} section in a medical AI research paper.

TASK: For each paragraph, identify its role in the argument structure and evaluate
how well it transitions from the previous paragraph. Then identify structural issues.

PARAGRAPH ROLES:
- background: Sets the broader context (prevalence, importance, field overview)
- problem: States the specific problem or challenge being addressed
- prior_work: Reviews what others have done (related work, existing methods)
- gap: Identifies what is missing in current approaches
- approach: Describes the proposed method or approach
- contribution: States what this paper contributes
- result: Presents a finding or observation
- interpretation: Discusses the meaning or implications of results
- limitation: Acknowledges limitations or caveats
- transition: Bridges between topics (should be rare as standalone paragraphs)
- other: Does not fit the above categories

EXPECTED ROLE SEQUENCE for ${sectionType}:
${expectedSequence.join(" -> ")}

ISSUE TYPES:
- topic_shift: Abrupt change in topic without a bridge sentence
- missing_bridge: Two related paragraphs lack a connecting transition
- redundant: Paragraph repeats information from another paragraph
- wrong_section: Content belongs in a different section (e.g., results in introduction)
- missing_literature: A topic is discussed without citing relevant work
- logical_gap: The argument skips a logical step
- role_sequence: Paragraphs appear in an unexpected order for this section type
- overlong_paragraph: Paragraph is too long (>300 words) and should be split

SCORING:
- 90-100: Excellent flow, clear argument progression, smooth transitions
- 70-89: Good flow with minor issues (missing transitions, slight redundancy)
- 50-69: Acceptable but needs revision (topic shifts, logical gaps)
- 30-49: Significant structural issues (wrong section content, major gaps)
- 0-29: Fundamental reorganization needed

${researchTopic ? `Research topic: ${researchTopic}` : ""}
${resultsSummary ? `Results summary: ${resultsSummary}` : ""}`,
    prompt: numberedParagraphs,
  });

  const roleSequence = object.paragraphs.map((p) => p.role).join(" -> ");

  return {
    paragraphs: object.paragraphs.map((p) => ({
      ...p,
      textPreview: paragraphs[p.index]?.slice(0, 200) ?? "",
    })),
    issues: object.issues,
    overallScore: object.overallScore,
    sectionSummary: object.sectionSummary,
    roleSequence,
    expectedSequence: expectedSequence.join(" -> "),
  };
}
```

---

## 4. Guideline Compliance Checker

### 4.1 Data Model

```prisma
model ComplianceReport {
  id              String   @id @default(cuid())
  documentId      String
  guidelineId     String               // "CONSORT-AI" | "TRIPOD-AI" | "STARD-AI" | "CLAIM" | "GAMER"
  versionNumber   Int

  report          Json                  // ComplianceReportResult (see below)
  overallStatus   String                // "compliant" | "partial" | "non_compliant"
  metCount        Int      @default(0)
  totalCount      Int      @default(0)

  document        Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  createdAt       DateTime @default(now())

  @@index([documentId])
  @@unique([documentId, guidelineId, versionNumber])
}
```

### 4.2 Guideline Database

```typescript
// src/lib/evidence/compliance/guidelines.ts

interface GuidelineItem {
  id: string;                       // e.g., "CONSORT-AI-1a"
  section: string;                  // e.g., "Title and Abstract"
  subsection?: string;              // e.g., "Title"
  requirement: string;              // What must be reported
  applicableSections: string[];     // Which manuscript sections this applies to
  examples: string[];               // Example compliant text
  keywords: string[];               // Keywords to search for in manuscript
  priority: "required" | "recommended" | "optional";
}

interface Guideline {
  id: string;
  name: string;
  fullName: string;
  applicableDesigns: string[];      // e.g., ["RCT with AI intervention"]
  items: GuidelineItem[];
  version: string;
  url: string;
  citation: string;                 // How to cite this guideline
}

// Phase 1 guidelines
export const GUIDELINES: Record<string, Guideline> = {
  "CONSORT-AI": {
    id: "CONSORT-AI",
    name: "CONSORT-AI",
    fullName: "Consolidated Standards of Reporting Trials - Artificial Intelligence",
    applicableDesigns: ["RCT with AI intervention", "Cluster RCT with AI"],
    version: "2020",
    url: "https://www.consort-ai.org/",
    citation: "Liu X, et al. Reporting guidelines for clinical trial reports for interventions involving artificial intelligence: the CONSORT-AI extension. Nat Med. 2020;26(9):1364-1374.",
    items: [
      {
        id: "CONSORT-AI-1a",
        section: "Title and Abstract",
        subsection: "Title",
        requirement: "Indicate that the intervention involves artificial intelligence/machine learning in the title",
        applicableSections: ["ABSTRACT"],
        examples: [
          "A Randomized Controlled Trial of an AI-Assisted Diagnostic Tool for...",
          "Deep Learning-Based Triage System: A Cluster Randomized Trial",
        ],
        keywords: ["AI", "artificial intelligence", "machine learning", "deep learning", "neural network"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-1b",
        section: "Title and Abstract",
        subsection: "Abstract",
        requirement: "Structured summary including AI-specific information: input data, output, intended use, and how the AI intervention was integrated into trial arms",
        applicableSections: ["ABSTRACT"],
        examples: [],
        keywords: ["input", "output", "model", "prediction", "classification"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-4a",
        section: "Methods",
        subsection: "Participants",
        requirement: "Describe the AI intervention, including input data, model architecture, training data source, and output specification",
        applicableSections: ["METHODS"],
        examples: [],
        keywords: ["architecture", "training data", "input", "output", "model"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-4b",
        section: "Methods",
        subsection: "Interventions",
        requirement: "Describe how the AI intervention was integrated into the clinical workflow, including the human-AI interaction",
        applicableSections: ["METHODS"],
        examples: [],
        keywords: ["workflow", "integration", "human", "interaction", "decision"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-5",
        section: "Methods",
        subsection: "AI-specific",
        requirement: "Describe the AI model version used, including software version and any updates during the trial",
        applicableSections: ["METHODS"],
        examples: [],
        keywords: ["version", "software", "update", "model version"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-14a",
        section: "Results",
        subsection: "AI Performance",
        requirement: "Report the performance of the AI system (e.g., sensitivity, specificity, AUROC) on the trial data",
        applicableSections: ["RESULTS"],
        examples: [],
        keywords: ["sensitivity", "specificity", "AUROC", "AUC", "accuracy", "performance"],
        priority: "required",
      },
      {
        id: "CONSORT-AI-19",
        section: "Discussion",
        subsection: "Interpretation",
        requirement: "Discuss the AI-specific limitations, including potential biases in training data and generalizability concerns",
        applicableSections: ["DISCUSSION"],
        examples: [],
        keywords: ["bias", "generalizability", "limitation", "training data", "external validation"],
        priority: "required",
      },
      // Additional items omitted for brevity -- full checklist has ~20 items
    ],
  },

  "TRIPOD-AI": {
    id: "TRIPOD-AI",
    name: "TRIPOD+AI",
    fullName: "Transparent Reporting of a Multivariable Prediction Model for Individual Prognosis or Diagnosis - AI",
    applicableDesigns: ["Prediction model development", "Prediction model validation", "Prediction model update"],
    version: "2024",
    url: "https://www.tripod-statement.org/",
    citation: "Collins GS, et al. TRIPOD+AI statement: updated reporting guidelines for clinical prediction models developed using AI. BMJ. 2024;385:e078378.",
    items: [
      {
        id: "TRIPOD-AI-1",
        section: "Title",
        requirement: "Identify the study as developing, validating, or updating a prediction model using AI, and specify the target population",
        applicableSections: ["ABSTRACT"],
        examples: [],
        keywords: ["prediction", "model", "development", "validation", "AI"],
        priority: "required",
      },
      {
        id: "TRIPOD-AI-5a",
        section: "Methods",
        subsection: "Data Sources",
        requirement: "Describe the data sources, including how training and test data were obtained and any selection criteria",
        applicableSections: ["METHODS"],
        examples: [],
        keywords: ["data source", "training", "test", "split", "cohort"],
        priority: "required",
      },
      {
        id: "TRIPOD-AI-7",
        section: "Methods",
        subsection: "Model",
        requirement: "Describe the model architecture, hyperparameters, and training procedure in sufficient detail for replication",
        applicableSections: ["METHODS"],
        examples: [],
        keywords: ["architecture", "hyperparameter", "training", "optimization", "learning rate"],
        priority: "required",
      },
      // Additional items omitted for brevity
    ],
  },

  "CLAIM": {
    id: "CLAIM",
    name: "CLAIM",
    fullName: "Checklist for Artificial Intelligence in Medical Imaging",
    applicableDesigns: ["Medical imaging AI study"],
    version: "2020",
    url: "https://pubs.rsna.org/doi/10.1148/ryai.2020200029",
    citation: "Mongan J, et al. Checklist for Artificial Intelligence in Medical Imaging (CLAIM). Radiol Artif Intell. 2020;2(2):e200029.",
    items: [
      {
        id: "CLAIM-1",
        section: "Title/Abstract",
        requirement: "State the imaging modality and body region studied",
        applicableSections: ["ABSTRACT"],
        examples: [],
        keywords: ["CT", "MRI", "X-ray", "ultrasound", "imaging", "modality"],
        priority: "required",
      },
      {
        id: "CLAIM-10",
        section: "Methods",
        subsection: "Data",
        requirement: "Report dataset demographics, imaging parameters, and any exclusion criteria",
        applicableSections: ["METHODS"],
        examples: [],
        keywords: ["demographics", "age", "sex", "exclusion", "inclusion", "criteria"],
        priority: "required",
      },
      // Additional items omitted for brevity
    ],
  },

  "STARD-AI": {
    id: "STARD-AI",
    name: "STARD-AI",
    fullName: "Standards for Reporting of Diagnostic Accuracy Studies - AI",
    applicableDesigns: ["Diagnostic accuracy study with AI"],
    version: "2021",
    url: "https://www.stard-statement.org/",
    citation: "Stable reference pending formal publication.",
    items: [
      {
        id: "STARD-AI-1",
        section: "Title/Abstract",
        requirement: "Identify the study as evaluating diagnostic accuracy of an AI system",
        applicableSections: ["ABSTRACT"],
        examples: [],
        keywords: ["diagnostic", "accuracy", "AI", "sensitivity", "specificity"],
        priority: "required",
      },
      // Additional items omitted for brevity
    ],
  },

  "GAMER": {
    id: "GAMER",
    name: "GAMER",
    fullName: "Guidelines for the use of Generative AI in Medical Education and Research",
    applicableDesigns: ["Any study using generative AI as a tool"],
    version: "2024",
    url: "https://www.nature.com/articles/s41591-024-02897-5",
    citation: "Giannakopoulos K, et al. Guidelines for the use of generative AI in medical education and research. Nat Med. 2024.",
    items: [
      {
        id: "GAMER-1",
        section: "Methods",
        subsection: "AI Disclosure",
        requirement: "Disclose which generative AI tools were used, including model name, version, and provider",
        applicableSections: ["METHODS"],
        examples: [
          "We used GPT-4 (OpenAI, version 2024-01-25) for initial literature screening.",
          "Gemini 2.5 Flash (Google) was used for translation of the manuscript from Japanese to English.",
        ],
        keywords: ["GPT", "ChatGPT", "Gemini", "Claude", "generative AI", "large language model", "LLM"],
        priority: "required",
      },
      {
        id: "GAMER-2",
        section: "Methods",
        subsection: "AI Use Scope",
        requirement: "Describe the specific tasks for which generative AI was used (e.g., literature review, writing assistance, data analysis, code generation)",
        applicableSections: ["METHODS"],
        examples: [],
        keywords: ["used for", "assisted", "generated", "drafted", "AI-assisted"],
        priority: "required",
      },
      {
        id: "GAMER-3",
        section: "Methods",
        subsection: "Human Oversight",
        requirement: "Describe the human oversight and verification process applied to AI-generated content",
        applicableSections: ["METHODS"],
        examples: [
          "All AI-generated text was reviewed and edited by the first author (XX).",
          "AI suggestions were verified against original sources by two independent reviewers.",
        ],
        keywords: ["reviewed", "verified", "oversight", "edited", "checked", "human"],
        priority: "required",
      },
    ],
  },
};
```

### 4.3 Compliance Check Pipeline

```typescript
// src/lib/evidence/compliance/check-compliance.ts

import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";
import { GUIDELINES } from "./guidelines";

interface ComplianceCheckInput {
  documentId: string;
  guidelineId: string;
  manuscriptSections: {
    sectionType: string;
    text: string;
  }[];
}

type ComplianceStatus = "met" | "partially_met" | "not_met" | "not_applicable";

interface ItemResult {
  itemId: string;
  status: ComplianceStatus;
  location: string | null;          // Where in the manuscript this requirement is addressed
  matchedText: string | null;       // The text that satisfies the requirement (if found)
  suggestion: string | null;        // What to add/change if not met
  confidence: number;               // 0.0-1.0
}

interface ComplianceReportResult {
  guidelineId: string;
  guidelineName: string;
  items: ItemResult[];
  summary: {
    met: number;
    partiallyMet: number;
    notMet: number;
    notApplicable: number;
    total: number;
    completionPercentage: number;
  };
  overallStatus: "compliant" | "partial" | "non_compliant";
  recommendations: string[];
}

const complianceItemSchema = z.object({
  itemId: z.string(),
  status: z.enum(["met", "partially_met", "not_met", "not_applicable"]),
  location: z.string().nullable().describe(
    "Section and approximate location in manuscript where this is addressed"
  ),
  matchedText: z.string().nullable().describe(
    "Quote from the manuscript that addresses this requirement"
  ),
  suggestion: z.string().nullable().describe(
    "Specific suggestion for how to meet this requirement if not fully met"
  ),
  confidence: z.number().min(0).max(1),
});

export async function checkCompliance(
  input: ComplianceCheckInput,
): Promise<ComplianceReportResult> {
  const guideline = GUIDELINES[input.guidelineId];
  if (!guideline) throw new Error(`Unknown guideline: ${input.guidelineId}`);

  // Process items in batches of 5 to avoid prompt length issues
  const BATCH_SIZE = 5;
  const allResults: ItemResult[] = [];

  for (let i = 0; i < guideline.items.length; i += BATCH_SIZE) {
    const batch = guideline.items.slice(i, i + BATCH_SIZE);

    const itemDescriptions = batch.map((item) => {
      const applicableSections = input.manuscriptSections
        .filter((s) => item.applicableSections.includes(s.sectionType))
        .map((s) => `[${s.sectionType}]\n${s.text}`)
        .join("\n\n");

      return `Item ${item.id}: ${item.requirement}\n` +
        `Priority: ${item.priority}\n` +
        `Keywords: ${item.keywords.join(", ")}\n` +
        `Applicable manuscript text:\n${applicableSections || "(no applicable sections found)"}`;
    }).join("\n\n---\n\n");

    const { object } = await generateObject({
      model: translationModel,
      schema: z.object({
        results: z.array(complianceItemSchema),
      }),
      system: `You are a reporting guideline compliance checker for medical AI research papers.

GUIDELINE: ${guideline.fullName} (${guideline.version})

TASK: For each checklist item, determine whether the manuscript meets the requirement.

STATUS RULES:
- "met": The requirement is clearly and fully addressed in the manuscript
- "partially_met": Some aspects are addressed but important details are missing
- "not_met": The requirement is not addressed at all
- "not_applicable": The requirement does not apply to this study design

CONFIDENCE CALIBRATION:
- 0.9+: Clear match or clear absence
- 0.7-0.89: Likely match/absence but wording is ambiguous
- 0.5-0.69: Uncertain, manual review needed

When the status is "not_met" or "partially_met", provide a specific, actionable suggestion
for what text to add and where to add it.`,
      prompt: itemDescriptions,
    });

    allResults.push(...object.results);
  }

  // Calculate summary
  const met = allResults.filter((r) => r.status === "met").length;
  const partiallyMet = allResults.filter((r) => r.status === "partially_met").length;
  const notMet = allResults.filter((r) => r.status === "not_met").length;
  const notApplicable = allResults.filter((r) => r.status === "not_applicable").length;
  const applicable = allResults.length - notApplicable;
  const completionPercentage = applicable > 0
    ? Math.round(((met + partiallyMet * 0.5) / applicable) * 100)
    : 100;

  const overallStatus: "compliant" | "partial" | "non_compliant" =
    completionPercentage >= 90 ? "compliant"
    : completionPercentage >= 50 ? "partial"
    : "non_compliant";

  // Generate top recommendations
  const recommendations = allResults
    .filter((r) => r.status === "not_met" && r.suggestion)
    .sort((a, b) => {
      const itemA = guideline.items.find((i) => i.id === a.itemId);
      const itemB = guideline.items.find((i) => i.id === b.itemId);
      const priorityOrder = { required: 0, recommended: 1, optional: 2 };
      return (priorityOrder[itemA?.priority ?? "optional"] ?? 2) -
        (priorityOrder[itemB?.priority ?? "optional"] ?? 2);
    })
    .slice(0, 5)
    .map((r) => `[${r.itemId}] ${r.suggestion}`);

  return {
    guidelineId: input.guidelineId,
    guidelineName: guideline.name,
    items: allResults,
    summary: {
      met,
      partiallyMet,
      notMet,
      notApplicable,
      total: allResults.length,
      completionPercentage,
    },
    overallStatus,
    recommendations,
  };
}
```

---

## 5. Evidence Export (PowerPoint)

### 5.1 Export Data Structure

```typescript
// src/lib/export/evidence-pptx.ts

interface EvidenceSlideData {
  // Manuscript side
  manuscriptSentence: string;
  manuscriptSection: string;
  sentenceIndex: number;

  // Evidence side
  supportingPassage: string;
  screenshotUrl: string | null;
  paperTitle: string;
  paperAuthors: string;       // "FirstAuthor et al."
  paperYear: number | null;
  paperSection: string | null;
  paperPage: number | null;
  doi: string | null;

  // Quality indicators
  confidence: number;
  mappingRationale: string;
  matchType: string;

  // Verification
  humanVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  verificationNote: string | null;
}
```

### 5.2 Slide Layout

Each evidence mapping generates one slide with this layout:

```
+------------------------------------------------------------------+
|  EVIDENCE DOCUMENTATION                            Slide X of Y  |
+------------------------------------------------------------------+
|                                                                    |
|  MANUSCRIPT CLAIM                                                  |
|  ----------------------------------------------------------------  |
|  "Deep learning has achieved remarkable results in medical image   |
|   segmentation [Ronneberger et al., 2015]"                        |
|                                                                    |
|  Section: Introduction | Sentence: 12                             |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  SUPPORTING EVIDENCE                                               |
|  ----------------------------------------------------------------  |
|                                                                    |
|  +----------------------------+                                    |
|  |                            |  Paper: Ronneberger et al. (2015)  |
|  |   [PDF Screenshot]         |  "U-Net: Convolutional Networks    |
|  |   Highlighted passage      |   for Biomedical Image             |
|  |                            |   Segmentation"                    |
|  +----------------------------+  Section: Results, Page 5          |
|                                  DOI: 10.1007/978-3-319-24574-4_28 |
|                                                                    |
+------------------------------------------------------------------+
|  Confidence: 0.95 | Match: direct_quote                           |
|  Rationale: The cited paper directly reports segmentation results  |
|  that match the manuscript's claim about performance.              |
|                                                                    |
|  [x] Human Verified by Dr. Tanaka on 2026-03-14                   |
+------------------------------------------------------------------+
```

### 5.3 PPTX Generation Implementation

```typescript
// src/lib/export/evidence-pptx.ts

import PptxGenJS from "pptxgenjs";
import { prisma } from "@/lib/prisma";

const COLORS = {
  headerBg: "1A365D",
  headerText: "FFFFFF",
  claimBg: "F7FAFC",
  evidenceBg: "FFFFFF",
  footerBg: "EDF2F7",
  verified: "38A169",
  unverified: "DD6B20",
  rejected: "E53E3E",
  highConfidence: "38A169",
  mediumConfidence: "DD6B20",
  lowConfidence: "E53E3E",
  textPrimary: "1A202C",
  textSecondary: "718096",
};

export async function generateEvidencePptx(
  documentId: string,
): Promise<Buffer> {
  // Fetch all evidence mappings for the document
  const mappings = await prisma.evidenceMapping.findMany({
    where: { documentId },
    include: {
      manuscriptCitation: {
        include: {
          paper: { include: { identifiers: true } },
        },
      },
    },
    orderBy: [
      { sectionType: "asc" },
      { sentenceIndex: "asc" },
    ],
  });

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  const pptx = new PptxGenJS();
  pptx.title = `Evidence Documentation: ${document?.title ?? "Untitled"}`;
  pptx.author = "Unmute AI";
  pptx.subject = "Manuscript Evidence Mapping";

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText("Evidence Documentation", {
    x: 1, y: 1.5, w: 8, h: 1,
    fontSize: 28, bold: true, color: COLORS.headerBg,
    fontFace: "Arial",
  });
  titleSlide.addText(document?.title ?? "Untitled Document", {
    x: 1, y: 2.8, w: 8, h: 0.6,
    fontSize: 16, color: COLORS.textSecondary,
    fontFace: "Arial",
  });
  titleSlide.addText(
    `${mappings.length} evidence mappings | ` +
    `${mappings.filter((m) => m.humanVerified).length} verified | ` +
    `Generated ${new Date().toISOString().split("T")[0]}`,
    {
      x: 1, y: 3.8, w: 8, h: 0.4,
      fontSize: 11, color: COLORS.textSecondary,
      fontFace: "Arial",
    },
  );

  // Summary slide
  const summarySlide = pptx.addSlide();
  addSummarySlide(summarySlide, mappings);

  // Evidence slides
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    const slide = pptx.addSlide();
    await addEvidenceSlide(slide, mapping, i + 1, mappings.length);
  }

  // Generate buffer
  const arrayBuffer = await pptx.write({ outputType: "arraybuffer" });
  return Buffer.from(arrayBuffer as ArrayBuffer);
}

function addSummarySlide(
  slide: PptxGenJS.Slide,
  mappings: Array<{
    confidence: number;
    humanVerified: boolean;
    verificationStatus: string;
    sectionType: string | null;
  }>,
): void {
  slide.addText("Evidence Summary", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 20, bold: true, color: COLORS.headerBg,
  });

  const sections = ["INTRODUCTION", "METHODS", "RESULTS", "DISCUSSION"];
  const rows: Array<Array<{ text: string; options?: object }>> = [
    [
      { text: "Section", options: { bold: true } },
      { text: "Mappings", options: { bold: true } },
      { text: "Verified", options: { bold: true } },
      { text: "Avg Confidence", options: { bold: true } },
    ],
  ];

  for (const section of sections) {
    const sectionMappings = mappings.filter((m) => m.sectionType === section);
    if (sectionMappings.length === 0) continue;
    const verified = sectionMappings.filter((m) => m.humanVerified).length;
    const avgConf = sectionMappings.reduce((sum, m) => sum + m.confidence, 0) / sectionMappings.length;

    rows.push([
      { text: section },
      { text: String(sectionMappings.length) },
      { text: `${verified}/${sectionMappings.length}` },
      { text: `${(avgConf * 100).toFixed(0)}%` },
    ]);
  }

  slide.addTable(rows, {
    x: 0.5, y: 1.2, w: 9,
    fontSize: 12,
    border: { pt: 0.5, color: "CCCCCC" },
    colW: [3, 2, 2, 2],
  });
}

async function addEvidenceSlide(
  slide: PptxGenJS.Slide,
  mapping: {
    manuscriptSentence: string;
    sectionType: string | null;
    sentenceIndex: number;
    supportingPassage: string;
    citedPaperSection: string | null;
    citedPaperPage: number | null;
    confidence: number;
    mappingRationale: string | null;
    screenshotUrl: string | null;
    humanVerified: boolean;
    verifiedBy: string | null;
    verifiedAt: Date | null;
    manuscriptCitation: {
      paper: {
        title: string;
        authors: unknown;
        year: number | null;
        identifiers: { provider: string; externalId: string }[];
      };
    };
  },
  slideNumber: number,
  totalSlides: number,
): Promise<void> {
  const paper = mapping.manuscriptCitation.paper;
  const authors = Array.isArray(paper.authors)
    ? (paper.authors as { name: string }[])
    : [];
  const authorStr = authors.length > 0
    ? authors.length > 2
      ? `${authors[0].name} et al.`
      : authors.map((a) => a.name).join(" and ")
    : "Unknown";
  const doi = paper.identifiers.find((id) => id.provider === "crossref")?.externalId;

  // Header
  slide.addText(`Evidence ${slideNumber}/${totalSlides}`, {
    x: 0.3, y: 0.15, w: 9.4, h: 0.35,
    fontSize: 10, color: COLORS.textSecondary,
    fontFace: "Arial",
  });

  // Manuscript claim section
  slide.addText("MANUSCRIPT CLAIM", {
    x: 0.3, y: 0.55, w: 9.4, h: 0.3,
    fontSize: 10, bold: true, color: COLORS.headerBg,
  });

  slide.addText(`"${mapping.manuscriptSentence}"`, {
    x: 0.5, y: 0.9, w: 9, h: 0.8,
    fontSize: 12, italic: true, color: COLORS.textPrimary,
    fontFace: "Arial",
    valign: "top",
  });

  slide.addText(
    `Section: ${mapping.sectionType ?? "Unknown"} | Sentence: ${mapping.sentenceIndex}`,
    {
      x: 0.5, y: 1.75, w: 9, h: 0.25,
      fontSize: 9, color: COLORS.textSecondary,
    },
  );

  // Supporting evidence section
  slide.addText("SUPPORTING EVIDENCE", {
    x: 0.3, y: 2.2, w: 9.4, h: 0.3,
    fontSize: 10, bold: true, color: COLORS.headerBg,
  });

  // Screenshot (left) + paper info (right)
  if (mapping.screenshotUrl) {
    try {
      slide.addImage({
        path: mapping.screenshotUrl,
        x: 0.5, y: 2.6, w: 4, h: 2.2,
      });
    } catch {
      slide.addText("[Screenshot unavailable]", {
        x: 0.5, y: 2.6, w: 4, h: 2.2,
        fontSize: 10, color: COLORS.textSecondary,
        align: "center", valign: "middle",
        border: { pt: 1, color: "CCCCCC" },
      });
    }
  } else {
    slide.addText("[No PDF screenshot available]", {
      x: 0.5, y: 2.6, w: 4, h: 2.2,
      fontSize: 10, color: COLORS.textSecondary,
      align: "center", valign: "middle",
      border: { pt: 1, color: "CCCCCC", dashType: "dash" },
    });
  }

  // Paper metadata (right of screenshot)
  const paperInfo = [
    `${authorStr} (${paper.year ?? "n.d."})`,
    `"${paper.title}"`,
    mapping.citedPaperSection ? `Section: ${mapping.citedPaperSection}` : "",
    mapping.citedPaperPage ? `Page: ${mapping.citedPaperPage}` : "",
    doi ? `DOI: ${doi}` : "",
  ].filter(Boolean).join("\n");

  slide.addText(paperInfo, {
    x: 4.8, y: 2.6, w: 4.7, h: 2.2,
    fontSize: 10, color: COLORS.textPrimary,
    fontFace: "Arial",
    valign: "top",
    lineSpacingMultiple: 1.3,
  });

  // Footer: confidence + verification
  const confColor = mapping.confidence >= 0.85
    ? COLORS.highConfidence
    : mapping.confidence >= 0.65
      ? COLORS.mediumConfidence
      : COLORS.lowConfidence;

  slide.addText(
    `Confidence: ${(mapping.confidence * 100).toFixed(0)}%`,
    {
      x: 0.5, y: 5.0, w: 2, h: 0.3,
      fontSize: 10, bold: true, color: confColor,
    },
  );

  if (mapping.mappingRationale) {
    slide.addText(mapping.mappingRationale, {
      x: 0.5, y: 5.35, w: 9, h: 0.5,
      fontSize: 9, color: COLORS.textSecondary,
      fontFace: "Arial",
      valign: "top",
    });
  }

  // Verification status
  const verificationText = mapping.humanVerified
    ? `Verified by ${mapping.verifiedBy ?? "unknown"} on ${mapping.verifiedAt?.toISOString().split("T")[0] ?? "unknown"}`
    : "Not yet verified";
  const verificationColor = mapping.humanVerified
    ? COLORS.verified
    : COLORS.unverified;

  slide.addText(
    `${mapping.humanVerified ? "[Verified]" : "[Unverified]"} ${verificationText}`,
    {
      x: 0.5, y: 5.95, w: 9, h: 0.3,
      fontSize: 9, bold: true, color: verificationColor,
    },
  );
}
```

---

## 6. UI Component Specifications

### 6.1 Evidence Mapping Panel

New tab added to the existing `WorkflowTabs` component.

```typescript
// Updated WorkflowTab type
type WorkflowTab = "write" | "citations" | "review" | "evidence-map";
```

#### 6.1.1 Component Tree

```
EvidenceMappingView
  EvidenceMappingToolbar
    BatchMapButton          // "Map all citations" / "Map section citations"
    ExportEvidenceButton    // "Export PPTX"
    FilterDropdown          // Filter by section, verification status, confidence
  EvidenceMappingSplitView
    ManuscriptSentenceList  // Left column: manuscript sentences with citations
      SentenceCard
        SentenceText
        CitationBadge       // Shows paper and verification status
        VerificationIcon    // Green check / amber warning / red X
    EvidenceDetailPanel     // Right column: evidence for selected sentence
      EvidenceHeader
        PaperInfo           // Title, authors, year
        ConfidenceBadge     // Color-coded confidence score
      ScreenshotPreview     // PDF screenshot with zoom
        ScreenshotImage
        ZoomControls
      PassageQuote          // Supporting passage text
      RationaleCard         // Why this passage supports the claim
      VerificationControls  // Verify / Reject / Needs Revision buttons
        VerifyButton
        RejectButton
        RevisionButton
        NoteInput           // Optional verification note
      AlternativePassages   // Other possible matching passages
  MappingProgressBar        // Shows overall mapping progress
```

#### 6.1.2 Split View Layout

```
+------------------------------------------------------------------+
|  Evidence Mapping                    [Map All] [Export PPTX] [v]  |
+------------------------------------------------------------------+
|  Filter: [All Sections v] [All Status v]     3/12 verified        |
+--------------------------------+---------------------------------+
|  MANUSCRIPT SENTENCES          |  EVIDENCE DETAIL                 |
|                                |                                  |
|  [x] 1. "Deep learning has... |  Paper: Ronneberger et al. 2015  |
|     Ronneberger 2015  0.95     |  "U-Net: Convolutional Networks  |
|                                |   for Biomedical Image Seg..."   |
|  [ ] 2. "U-Net architecture...|                                  |
|     Ronneberger 2015  --       |  +----------------------------+  |
|                                |  |                            |  |
|  [~] 3. "Transfer learning... |  |   [PDF Screenshot]         |  |
|     Tajbakhsh 2016  0.72       |  |   Highlighted region       |  |
|                                |  |                            |  |
|  [!] 4. "Recent studies show..|  +----------------------------+  |
|     No mapping yet             |                                  |
|                                |  "Our results demonstrate that   |
|  ...                           |   the U-Net architecture achieves|
|                                |   state-of-the-art results..."   |
|                                |                                  |
|                                |  Section: Results, Page 5        |
|                                |  Confidence: 95%                 |
|                                |                                  |
|                                |  Rationale: The cited paper      |
|                                |  directly reports segmentation   |
|                                |  results matching the claim.     |
|                                |                                  |
|                                |  [Verify] [Reject] [Revision]   |
|                                |  Note: _______________________   |
+--------------------------------+---------------------------------+
|  Progress: ████████████░░░░░░░░  8/12 mapped  3 verified         |
+------------------------------------------------------------------+
```

#### 6.1.3 Verification Status Icons

| Status | Icon | Color | Meaning |
|---|---|---|---|
| Verified | Checkmark circle | Green | Human confirmed mapping is correct |
| Pending | Clock | Amber | Mapped but not yet verified |
| Rejected | X circle | Red | Human rejected the mapping |
| Needs revision | Alert triangle | Orange | Issues flagged, needs re-mapping |
| Not mapped | Dash | Gray | No mapping exists yet |

### 6.2 Flow Analysis Panel

New panel accessible from the paragraph-level action toolbar.

#### 6.2.1 Component Tree

```
FlowAnalysisView
  FlowAnalysisHeader
    SectionSelector         // Which section to analyze
    AnalyzeButton           // "Analyze Flow"
    ScoreDisplay            // Overall score badge (0-100)
  FlowVisualization
    ParagraphRoleStrip      // Horizontal strip of color-coded paragraph roles
      RoleBadge             // One per paragraph, color = role type
      FlowArrow             // Arrow between paragraphs showing connection quality
    RoleSequenceCompare     // "Actual: bg -> prob -> gap" vs "Expected: bg -> prob -> pw -> gap"
  FlowIssueList
    FlowIssueCard
      IssueSeverityBadge    // High / Medium / Low
      IssueTypeLabel        // "Topic Shift" / "Missing Bridge" / etc.
      IssueDescription      // What's wrong
      IssueSuggestion       // How to fix
      JumpToParagraph       // Click to highlight paragraph in editor
  ParagraphRoleDetail       // Expanded view when clicking a paragraph
    RoleLabel
    TopicsList
    TransitionQuality       // Score + note
    RelatedIssues           // Issues affecting this paragraph
```

#### 6.2.2 Role Color Coding

| Role | Color | Hex |
|---|---|---|
| background | Blue | #3182CE |
| problem | Red | #E53E3E |
| prior_work | Purple | #805AD5 |
| gap | Orange | #DD6B20 |
| approach | Teal | #319795 |
| contribution | Green | #38A169 |
| result | Indigo | #5A67D8 |
| interpretation | Pink | #D53F8C |
| limitation | Gray | #718096 |
| transition | Light gray | #A0AEC0 |
| other | Slate | #4A5568 |

#### 6.2.3 Flow Visualization Layout

```
+------------------------------------------------------------------+
|  Flow Analysis: Introduction              Score: 72/100           |
+------------------------------------------------------------------+
|                                                                    |
|  PARAGRAPH ROLES                                                   |
|  [BG] ──> [BG] ──> [PW] ──> [GAP] ─!─> [RES] ──> [CONTR]       |
|   1        2        3         4     !!     5         6             |
|                                   topic                            |
|                                   shift                            |
|                                                                    |
|  Expected: BG -> PROB -> PW -> GAP -> APPROACH -> CONTR           |
|  Actual:   BG -> BG -> PW -> GAP -> RESULT -> CONTR               |
|                                                                    |
+------------------------------------------------------------------+
|  ISSUES (3)                                                        |
|                                                                    |
|  [HIGH] Role Sequence - Paragraph 5                                |
|  Result presentation in Introduction section. Results belong       |
|  in the Results section. Consider replacing with the approach      |
|  description.                                                      |
|  [Jump to paragraph]                                               |
|                                                                    |
|  [MED] Missing Bridge - Paragraph 3 -> 4                          |
|  Abrupt transition from prior work review to gap identification.   |
|  Add a bridge sentence summarizing limitations of reviewed work.   |
|  [Jump to paragraph]                                               |
|                                                                    |
|  [LOW] Redundant - Paragraphs 1 and 2                             |
|  Both paragraphs cover background context. Consider merging.       |
|  [Jump to paragraph]                                               |
+------------------------------------------------------------------+
```

### 6.3 Compliance Panel

#### 6.3.1 Component Tree

```
ComplianceView
  GuidelineSelector
    GuidelineDropdown       // CONSORT-AI, TRIPOD+AI, STARD-AI, CLAIM, GAMER
    GuidelineInfo           // Brief description and applicability
  ComplianceSummary
    ProgressBar             // X/Y items met
    StatusChips             // Met / Partially Met / Not Met / N/A counts
  ComplianceChecklist
    ComplianceItemCard
      ItemIdBadge           // e.g., "CONSORT-AI-1a"
      RequirementText       // What must be reported
      StatusBadge           // Met / Partially Met / Not Met / N/A
      LocationInfo          // Where in manuscript (if found)
      MatchedTextPreview    // Quoted text that satisfies requirement
      SuggestionCard        // What to add if not met
      JumpToLocation        // Click to highlight in editor
  ComplianceActions
    CheckButton             // "Run Compliance Check"
    ExportChecklistButton   // Download checklist as CSV/PDF
```

#### 6.3.2 Compliance Panel Layout

```
+------------------------------------------------------------------+
|  Compliance Check                                                  |
+------------------------------------------------------------------+
|  Guideline: [CONSORT-AI v]                                        |
|  "Reporting guideline for clinical trials involving AI"            |
+------------------------------------------------------------------+
|                                                                    |
|  Progress: ████████████░░░░░░░░  14/20 items met (70%)            |
|  [14 Met] [3 Partial] [2 Not Met] [1 N/A]                         |
|                                                                    |
+------------------------------------------------------------------+
|  CHECKLIST                                                         |
|                                                                    |
|  [MET] CONSORT-AI-1a: Title mentions AI                           |
|  Found in: Abstract                                                |
|  "A Randomized Trial of an AI-Assisted Diagnostic..."             |
|                                                                    |
|  [PARTIAL] CONSORT-AI-4a: AI intervention description             |
|  Found in: Methods                                                 |
|  Input data described, but model architecture details missing.     |
|  Suggestion: Add model architecture (layers, parameters) and      |
|  training data source to the Methods section.                      |
|  [Jump to Methods]                                                 |
|                                                                    |
|  [NOT MET] CONSORT-AI-14a: AI performance metrics                 |
|  Not found in manuscript.                                          |
|  Suggestion: Add a subsection in Results reporting sensitivity,    |
|  specificity, and AUROC of the AI system on trial data.            |
|  [Jump to Results]                                                 |
|                                                                    |
+------------------------------------------------------------------+
|  [Run Check] [Export Checklist]                                    |
+------------------------------------------------------------------+
```

---

## 7. API Specifications

### 7.1 Evidence Mapping APIs

#### POST /api/evidence/map

Maps a single manuscript citation to a supporting passage in the cited paper.

```typescript
// Request
interface MapRequest {
  documentId: string;
  manuscriptCitationId: string;
  sentenceIndex: number;
  manuscriptSentence: string;
}

// Response (200 OK)
interface MapResponse {
  mapping: {
    id: string;
    supportingPassage: string;
    citedPaperSection: string | null;
    citedPaperPage: number | null;
    confidence: number;
    mappingRationale: string;
    screenshotUrl: string | null;
    matchType: "direct_quote" | "paraphrase_match" | "semantic_match" | "no_match";
    humanVerified: false;
    warnings: string[];
  };
  agentRunId: string;
}

// Error responses:
// 400: Invalid input (missing fields, invalid documentId)
// 404: ManuscriptCitation not found
// 500: Pipeline failure (PDF download, Gemini API, etc.)
```

#### POST /api/evidence/map/batch

Maps all citations in a document or section.

```typescript
// Request
interface BatchMapRequest {
  documentId: string;
  sectionType?: string;       // Optional: limit to section
  skipExisting?: boolean;     // Default: true
}

// Response (200 OK)
interface BatchMapResponse {
  agentRunId: string;
  total: number;
  status: "running";          // Always returns immediately
}

// Progress polling: GET /api/evidence/map/batch/status?agentRunId=xxx
interface BatchMapStatus {
  status: "running" | "completed" | "failed";
  total: number;
  completed: number;
  failed: number;
  results: {
    mappingId: string;
    paperId: string;
    confidence: number;
    matchType: string;
  }[];
}
```

#### POST /api/evidence/verify-human

Records human verification of an evidence mapping.

```typescript
// Request
interface VerifyHumanRequest {
  mappingId: string;
  status: "verified" | "rejected" | "needs_revision";
  note?: string;
}

// Response (200 OK)
interface VerifyHumanResponse {
  mapping: {
    id: string;
    humanVerified: boolean;
    verificationStatus: string;
    verifiedAt: string;
  };
}
```

#### GET /api/evidence/mappings?documentId=xxx

Fetches all evidence mappings for a document.

```typescript
// Query parameters
interface MappingsQuery {
  documentId: string;
  sectionType?: string;
  verificationStatus?: "pending" | "verified" | "rejected" | "needs_revision";
  minConfidence?: number;
}

// Response (200 OK)
interface MappingsResponse {
  mappings: Array<{
    id: string;
    manuscriptSentence: string;
    sentenceIndex: number;
    sectionType: string | null;
    supportingPassage: string;
    citedPaperSection: string | null;
    citedPaperPage: number | null;
    confidence: number;
    mappingRationale: string | null;
    screenshotUrl: string | null;
    matchType: string;
    humanVerified: boolean;
    verificationStatus: string;
    verifiedAt: string | null;
    paper: {
      id: string;
      title: string;
      authors: { name: string }[];
      year: number | null;
      doi: string | null;
    };
  }>;
  summary: {
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    averageConfidence: number;
  };
}
```

### 7.2 Flow Analysis APIs

#### POST /api/evidence/flow/analyze

```typescript
// Request
interface FlowAnalyzeRequest {
  documentId: string;
  sectionType: string;
  researchTopic?: string;
  resultsSummary?: string;
}

// Response (200 OK)
interface FlowAnalyzeResponse {
  analysisId: string;
  result: ParagraphFlowResult;    // See Section 3.2
}
```

### 7.3 Compliance APIs

#### POST /api/evidence/compliance/check

```typescript
// Request
interface ComplianceCheckRequest {
  documentId: string;
  guidelineId: string;
}

// Response (200 OK)
interface ComplianceCheckResponse {
  reportId: string;
  result: ComplianceReportResult;  // See Section 4.3
}
```

### 7.4 Export APIs

#### GET /api/export/evidence-pptx?documentId=xxx

Returns a PowerPoint file with evidence documentation slides.

```typescript
// Response headers:
// Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
// Content-Disposition: attachment; filename="evidence-documentation.pptx"

// Query parameters:
interface EvidencePptxQuery {
  documentId: string;
  sectionType?: string;           // Optional: export only one section
  verifiedOnly?: boolean;         // Optional: include only verified mappings
}
```

---

## 8. Error Handling and Edge Cases

### 8.1 PDF Retrieval Failures

| Scenario | Behavior |
|---|---|
| Paper is paywalled | Fall back to abstract-only mapping. Set `source: "text-only"`. Add warning. |
| PDF URL returns 403/404 | Try next provider in cascade. If all fail, use text-only. |
| PDF is corrupted | Set PdfCache status to "failed". Use text-only fallback. |
| PDF is scanned image (no text layer) | Set PdfCache status to "failed" with reason "no text layer". Use text-only. |
| PDF exceeds size limit (50MB) | Reject download. Use text-only fallback. |
| Provider rate limit hit | Exponential backoff with 3 retries. If all fail, queue for later. |

### 8.2 Passage Matching Edge Cases

| Scenario | Behavior |
|---|---|
| No matching passage found | Set `matchType: "no_match"`, `confidence: 0.1`. Flag as potential misattribution. |
| Multiple equally good passages | Return best match as primary, others as `alternativePassages`. |
| Passage spans multiple pages | Use the first page for screenshot. Note full range in metadata. |
| Manuscript sentence is in Japanese | Translate to English before matching. Store both versions. |
| Cited paper is in non-English language | Attempt matching in the paper's language. Lower confidence cap to 0.7. |
| Very long manuscript sentence (>500 chars) | Decompose into multiple atomic claims. Create one mapping per claim. |

### 8.3 Screenshot Generation Edge Cases

| Scenario | Behavior |
|---|---|
| Text not found on expected page | Search adjacent pages (-1, +1). If still not found, return null screenshot. |
| Text spans two columns | Expand bounding box to cover both column positions. |
| Text is in a table or figure caption | Include full table/figure region in screenshot with extra padding. |
| PDF has non-standard encoding | Skip screenshot. Return mapping without screenshot. |

### 8.4 Human Verification Edge Cases

| Scenario | Behavior |
|---|---|
| Re-mapping after verification | Reset to `pending`. Notify user that re-verification is needed. |
| Mapping deleted while under review | Cascade delete removes mapping. No orphan verification records. |
| Concurrent verification by multiple users | Last-write-wins with `updatedAt` check. Log all verification actions. |

---

## 9. Performance and Scalability

### 9.1 Pipeline Performance Targets

| Operation | Target Latency | Notes |
|---|---|---|
| Single evidence mapping | < 30s | Includes PDF fetch + Gemini call + screenshot |
| Batch mapping (10 citations) | < 3 min | 3 concurrent workers |
| PDF download + parse | < 15s | Cached after first download |
| Passage matching (Gemini) | < 10s | Single LLM call |
| Screenshot generation | < 5s | Render + crop + upload |
| Flow analysis (per section) | < 15s | Single LLM call |
| Compliance check (per guideline) | < 30s | Batched LLM calls |
| PPTX generation (20 slides) | < 10s | In-memory generation |

### 9.2 Caching Strategy

| Cache Layer | Scope | TTL | Invalidation |
|---|---|---|---|
| PdfCache (DB) | Per paper | Indefinite | Manual re-download only |
| Parsed text (JSON in PdfCache) | Per paper | Indefinite | On PDF re-download |
| Screenshots (object storage) | Per mapping | Indefinite | On mapping re-run |
| Gemini response | None | N/A | Always fresh (context-dependent) |

### 9.3 Rate Limiting

| External API | Rate Limit | Strategy |
|---|---|---|
| Gemini 2.5 Flash | 1000 RPM | Token bucket, queue overflow |
| Unpaywall | 100K/day | Cached results, daily budget |
| PMC / PubMed | 3 req/s | Request queue with delay |
| CORE | 10 req/s | Request queue |
| Object storage | No practical limit | Standard retry |

### 9.4 Concurrency Controls

- Batch mapping: max 3 concurrent `mapEvidence` calls per document
- PDF downloads: max 5 concurrent downloads across all users
- Gemini calls: max 10 concurrent calls across all operations (shared pool)
- Screenshot generation: max 3 concurrent renders (CPU-intensive)

---

## 10. Security Considerations

### 10.1 PDF Handling

- PDFs are stored in private object storage, not publicly accessible
- PDF URLs are signed with time-limited tokens for client access
- Downloaded PDFs are scanned for maximum file size (50MB limit)
- PDF parsing is sandboxed -- no JavaScript execution from PDF content

### 10.2 Screenshot Storage

- Screenshots are stored in private object storage
- Access requires authentication + document ownership verification
- Screenshot URLs are signed, expiring after 1 hour
- No user-uploaded content in screenshot pipeline (only generated from PDFs)

### 10.3 Data Access Control

- Evidence mappings are scoped to document ownership
- Verification actions require document owner authentication
- Batch operations check user ownership before processing
- Export endpoints verify document access before generating files

### 10.4 LLM Prompt Injection

- Paper text is treated as untrusted input in Gemini prompts
- System prompts use clear delimiters to separate instructions from paper content
- Output validation via Zod schemas rejects malformed LLM responses
- Confidence scores are capped and validated (0.0-1.0 range enforced)

---

## 11. Implementation Phases

### Phase 1: Evidence Mapping MVP (4-6 weeks)

**Goal**: Users can map individual citations to source passages and verify them.

| Week | Deliverables |
|---|---|
| 1-2 | `PdfCache` model + PDF download pipeline + `pdf-parse` integration. `EvidenceMapping` model + migration. |
| 2-3 | Passage matching service (`decompose-claim.ts`, `passage-matcher.ts`). `POST /api/evidence/map` endpoint. |
| 3-4 | Screenshot generation service. Object storage integration (Vercel Blob). |
| 4-5 | Evidence mapping UI (split view in editor). Human verification workflow (verify/reject/revise buttons). |
| 5-6 | Batch mapping. Evidence PPTX export. |

**Dependencies**: Existing `ManuscriptCitation`, `CanonicalPaper`, `fulltext-resolver.ts`.

**Acceptance criteria**:
- Single citation mapping works end-to-end with screenshot
- Human verification sets `verifiedBy` and `verifiedAt`
- PPTX export produces readable slides with screenshots
- `uv run vitest run` passes for new modules (unit tests for decompose, match, screenshot)

### Phase 2: Writing Quality (3-4 weeks)

**Goal**: Users can analyze paragraph flow and get structural feedback.

| Week | Deliverables |
|---|---|
| 1-2 | `ParagraphAnalysis` model. Flow analysis service. `POST /api/evidence/flow/analyze` endpoint. |
| 2-3 | Flow analysis UI (role strip, issue list, paragraph detail). Editor integration (paragraph-level action). |
| 3-4 | Introduction structure analyzer (specialized prompts). Missing literature suggestion (integration with discover pipeline). |

**Dependencies**: Existing `DocumentVersion`, `sections.ts`, `claim-compiler.ts`.

**Acceptance criteria**:
- Flow analysis produces role assignments for all paragraphs
- Issues list identifies at least topic shifts and missing bridges
- UI shows color-coded role strip and clickable issue cards
- Score range 0-100 with calibrated thresholds

### Phase 3: Compliance and Polish (2-3 weeks)

**Goal**: Users can check manuscript against reporting guidelines.

| Week | Deliverables |
|---|---|
| 1 | Guideline database (CONSORT-AI, TRIPOD+AI, CLAIM). `ComplianceReport` model. Compliance check service. |
| 1-2 | `POST /api/evidence/compliance/check` endpoint. Compliance UI (guideline selector, checklist, progress bar). |
| 2-3 | GAMER auto-disclosure generation. STARD-AI guideline. Polish: loading states, error handling, empty states. |

**Dependencies**: Existing `DocumentVersion`, `sections.ts`.

**Acceptance criteria**:
- CONSORT-AI checklist produces item-by-item status for all 20 items
- Compliance UI shows progress bar and actionable suggestions
- GAMER guideline generates disclosure text for Unmute AI's own AI usage
- All five guidelines are loaded and testable

---

## 12. Testing Strategy

### 12.1 Unit Tests

| Module | Test Focus | Priority |
|---|---|---|
| `decompose-claim.ts` | Correct atomic claim extraction for various sentence structures | P0 |
| `passage-matcher.ts` | Confidence calibration, no-match detection, verbatim quote extraction | P0 |
| `screenshot-generator.ts` | Text position finding, bounding box calculation, adjacent page search | P0 |
| `pdf-retriever.ts` | Fallback cascade, PdfCache upsert, error handling | P0 |
| `analyze-flow.ts` | Role assignment accuracy, issue detection, score calibration | P1 |
| `check-compliance.ts` | Status assignment accuracy, batch processing, summary calculation | P1 |
| `evidence-pptx.ts` | Slide generation, image embedding, summary table | P1 |
| `map-evidence.ts` | End-to-end orchestration, AgentRun lifecycle, idempotency | P1 |

### 12.2 Integration Tests

| Test | Description | Priority |
|---|---|---|
| PDF download + parse | Download a known OA paper, parse text, verify page count | P0 |
| Evidence mapping E2E | Map a real citation, verify passage match, generate screenshot | P0 |
| Batch mapping | Map 5 citations, verify progress tracking, check results | P1 |
| Human verification flow | Create mapping, verify, re-map, check status reset | P1 |
| PPTX export | Generate PPTX with 10 slides, verify file structure | P1 |
| Compliance check | Run CONSORT-AI on sample manuscript, verify item statuses | P2 |

### 12.3 Test Fixtures

Pre-built test fixtures for deterministic testing:

```typescript
// tests/fixtures/evidence-mapping.ts

export const FIXTURE_PAPER_UNET = {
  title: "U-Net: Convolutional Networks for Biomedical Image Segmentation",
  authors: [{ name: "Olaf Ronneberger" }, { name: "Philipp Fischer" }, { name: "Thomas Brox" }],
  year: 2015,
  doi: "10.1007/978-3-319-24574-4_28",
  arxivId: "1505.04597",
  abstract: "There is large consent that successful training of deep networks requires...",
};

export const FIXTURE_MANUSCRIPT_SENTENCE =
  "Deep learning has achieved remarkable results in medical image segmentation, " +
  "particularly through architectures like U-Net.";

export const FIXTURE_SUPPORTING_PASSAGE =
  "We demonstrate that such a network can be trained end-to-end from very few images " +
  "and outperforms the prior best method (a sliding-window convolutional network) " +
  "on the ISBI challenge for segmentation of neuronal structures.";

export const FIXTURE_PDF_PARSED_TEXT: ParsedPdfText = {
  pages: [
    {
      pageNumber: 1,
      text: "U-Net: Convolutional Networks for Biomedical Image Segmentation...",
      sections: [{ heading: "Abstract", startChar: 0, endChar: 500, sectionType: "ABSTRACT" }],
    },
    // ... additional pages
  ],
  totalCharCount: 25000,
  extractionMethod: "pdf-parse",
};
```

### 12.4 Gemini Response Mocking

For unit tests, mock Gemini responses to avoid API calls:

```typescript
// tests/mocks/gemini.ts

import { vi } from "vitest";

export function mockPassageMatcherResponse(overrides?: Partial<PassageMatchResult>) {
  vi.mock("@/lib/gemini", () => ({
    translationModel: {
      // Mock model that returns deterministic results
    },
  }));

  vi.mock("ai", () => ({
    generateObject: vi.fn().mockResolvedValue({
      object: {
        primaryMatch: {
          supportingPassage: FIXTURE_SUPPORTING_PASSAGE,
          sectionHeading: "Results",
          approximatePage: 5,
          confidence: 0.95,
          rationale: "Direct statement of segmentation performance.",
          matchType: "direct_quote",
          ...overrides,
        },
        alternativeMatches: [],
        warnings: [],
      },
    }),
  }));
}
```

### 12.5 Acceptance Test Scenarios

| Scenario | Steps | Expected Outcome |
|---|---|---|
| Happy path: single mapping | Create document with citation -> Map -> Verify | EvidenceMapping with screenshot, humanVerified = true |
| No PDF available | Map citation for paywalled paper | Mapping with text-only source, no screenshot, warning |
| Misattributed citation | Map citation where paper does not support claim | matchType = "no_match", confidence < 0.3, warning |
| Batch mapping | Create document with 10 citations -> Batch map | 10 mappings created, progress tracked, AgentRun completed |
| PPTX export | Map 5 citations -> Verify 3 -> Export | PPTX with 5 slides, 3 marked verified, 2 marked unverified |
| Flow analysis | Write introduction with 6 paragraphs -> Analyze | Role assignments, issue detection, score 0-100 |
| Compliance check | Write methods section -> Check CONSORT-AI | Item-by-item status, actionable suggestions |

---

## Appendix A: File Structure

New files introduced by v2:

```
src/
  lib/
    evidence/
      mapping/
        decompose-claim.ts          # Step 1: Claim decomposition
        pdf-retriever.ts            # Step 2: PDF download + parse
        passage-matcher.ts          # Step 3: Gemini passage matching
        screenshot-generator.ts     # Step 4: PDF screenshot capture
        map-evidence.ts             # Step 5: Pipeline orchestrator
        batch-map.ts                # Batch mapping coordinator
        types.ts                    # Shared types for mapping pipeline
      flow/
        analyze-flow.ts             # Paragraph flow analysis
        types.ts                    # Flow analysis types
      compliance/
        guidelines.ts               # Guideline database
        check-compliance.ts         # Compliance checking service
        types.ts                    # Compliance types
    export/
      evidence-pptx.ts              # PPTX generation
  app/
    api/
      evidence/
        map/
          route.ts                  # POST /api/evidence/map
          batch/
            route.ts                # POST /api/evidence/map/batch
            status/
              route.ts              # GET /api/evidence/map/batch/status
        verify-human/
          route.ts                  # POST /api/evidence/verify-human
        mappings/
          route.ts                  # GET /api/evidence/mappings
        flow/
          analyze/
            route.ts                # POST /api/evidence/flow/analyze
        compliance/
          check/
            route.ts                # POST /api/evidence/compliance/check
      export/
        evidence-pptx/
          route.ts                  # GET /api/export/evidence-pptx
  components/
    evidence/
      evidence-mapping-view.tsx     # Main evidence mapping panel
      manuscript-sentence-list.tsx  # Left column: sentences
      evidence-detail-panel.tsx     # Right column: evidence detail
      screenshot-preview.tsx        # PDF screenshot viewer
      verification-controls.tsx     # Verify/Reject/Revise buttons
      mapping-progress-bar.tsx      # Progress indicator
    flow/
      flow-analysis-view.tsx        # Main flow analysis panel
      paragraph-role-strip.tsx      # Color-coded role visualization
      flow-issue-list.tsx           # Issue cards
      flow-issue-card.tsx           # Individual issue
    compliance/
      compliance-view.tsx           # Main compliance panel
      guideline-selector.tsx        # Guideline dropdown
      compliance-checklist.tsx      # Checklist with items
      compliance-item-card.tsx      # Individual checklist item
tests/
  unit/
    evidence/
      mapping/
        decompose-claim.test.ts
        passage-matcher.test.ts
        screenshot-generator.test.ts
        map-evidence.test.ts
      flow/
        analyze-flow.test.ts
      compliance/
        check-compliance.test.ts
    export/
      evidence-pptx.test.ts
  fixtures/
    evidence-mapping.ts
  mocks/
    gemini.ts
```

## Appendix B: Database Migration Plan

Migration should be applied in this order:

1. **Migration 1**: Add `PdfCache` table (no dependencies on existing tables except `CanonicalPaper`)
2. **Migration 2**: Add `EvidenceMapping` table (depends on `Document`, `ManuscriptCitation`)
3. **Migration 3**: Add `ParagraphAnalysis` table (depends on `Document`)
4. **Migration 4**: Add `ComplianceReport` table (depends on `Document`)

All migrations use `prisma migrate dev` locally and `prisma migrate deploy` in CI/CD.

Rollback strategy: Each migration is independently reversible. Dropping a v2 table does not affect v1 functionality.

## Appendix C: Gemini Prompt Token Estimates

| Operation | System Prompt | User Prompt (avg) | Output (avg) | Total Tokens |
|---|---|---|---|---|
| Claim decomposition | ~300 | ~200 | ~150 | ~650 |
| Passage matching | ~800 | ~5,000 (paper text) | ~500 | ~6,300 |
| Flow analysis | ~600 | ~3,000 (section text) | ~800 | ~4,400 |
| Compliance check (5 items) | ~500 | ~2,000 | ~600 | ~3,100 |

Estimated cost per full document mapping (20 citations + flow + compliance):
- Passage matching: 20 x 6,300 = 126,000 tokens
- Flow analysis: 4 sections x 4,400 = 17,600 tokens
- Compliance check: 4 batches x 3,100 = 12,400 tokens
- Total: ~156,000 tokens (~$0.02 at Gemini 2.5 Flash pricing)
