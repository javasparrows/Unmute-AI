# Unmute AI v2 -- Basic Design

Date: 2026-03-15
Status: Draft
Version: 2.0

## Document Purpose

This basic design document specifies the architecture, data model extensions, API
surface, and UI layout for Unmute AI v2. The primary addition is the **Evidence
Documentation System** -- a pipeline that proves each manuscript citation is
supported by the cited paper's actual content, with PDF screenshots and human
verification records that can be exported for reviewers and co-authors.

This document is written against the existing codebase (Next.js 16, React 19,
TipTap v3, Prisma + Neon PostgreSQL, Google Gemini via Vercel AI SDK, Vercel
deployment) and preserves all current schema models.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
+-----------------------------------------------------------------------+
|                           Browser (Client)                            |
|                                                                       |
|  +-------------------+  +--------------------+  +-----------------+   |
|  | Write Workspace   |  | Evidence Tab       |  | Export Tab      |   |
|  | (TipTap Editor)   |  | (Split View)       |  | (PPTX/PDF/DOCX)|   |
|  |                   |  |                    |  |                 |   |
|  | - Source Pane     |  | - Manuscript Left  |  | - Evidence Deck |   |
|  | - Manuscript Pane |  | - Evidence Right   |  | - Compliance    |   |
|  | - Section Rail    |  | - PDF Preview      |  | - Bibliography  |   |
|  +-------------------+  +--------------------+  +-----------------+   |
|           |                      |                       |            |
+-----------+----------------------+-----------------------+------------+
            |                      |                       |
            v                      v                       v
+-----------------------------------------------------------------------+
|                    Next.js 16 API Layer (Server)                      |
|                                                                       |
|  +------------------+  +--------------------+  +------------------+   |
|  | Translation APIs |  | Evidence APIs      |  | Export APIs      |   |
|  | /translate-sent  |  | /evidence/map      |  | /export/pptx    |   |
|  | /align-sentences |  | /evidence/verify   |  | /export/pdf     |   |
|  | /detect-language |  | /evidence/coverage |  | /export/bibtex  |   |
|  +------------------+  +--------------------+  +------------------+   |
|           |                      |                       |            |
|  +------------------+  +--------------------+  +------------------+   |
|  | LLM Services     |  | PDF Pipeline       |  | Analysis Engine |   |
|  | - Gemini API     |  | - Download         |  | - Para. Flow    |   |
|  | - Claim Compiler |  | - Parse/Extract    |  | - Compliance    |   |
|  | - Grounded Writer|  | - Screenshot Gen   |  | - Advers. Review|   |
|  +------------------+  +--------------------+  +------------------+   |
|           |                      |                       |            |
+-----------+----------------------+-----------------------+------------+
            |                      |                       |
            v                      v                       v
+-----------------------------------------------------------------------+
|                         Data & Storage Layer                          |
|                                                                       |
|  +------------------+  +--------------------+  +------------------+   |
|  | Neon PostgreSQL  |  | Vercel Blob / S3   |  | External APIs   |   |
|  | (Prisma ORM)     |  | (PDF files,        |  | - OpenAlex      |   |
|  |                  |  |  screenshots,      |  | - Crossref      |   |
|  | - Users          |  |  exports)          |  | - PubMed/PMC    |   |
|  | - Documents      |  |                    |  | - Semantic S.   |   |
|  | - Evidence       |  |                    |  | - arXiv         |   |
|  | - Citations      |  |                    |  | - Unpaywall     |   |
|  | - Compliance     |  |                    |  | - CORE          |   |
|  +------------------+  +--------------------+  +------------------+   |
+-----------------------------------------------------------------------+
```

### 1.2 Component Overview

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| Write Workspace | Bilingual editing, translation, section management | TipTap v3, React 19 |
| Evidence Tab | Evidence mapping display, PDF screenshots, verification | React 19, pdf.js |
| Export Tab | Evidence documentation export (PPTX, PDF, DOCX) | pptxgenjs, docx lib |
| Translation APIs | Sentence translation, alignment, language detection | Gemini API, Vercel AI SDK |
| Evidence APIs | Mapping, verification, coverage, human verification | Gemini API, Prisma |
| PDF Pipeline | Download, parse, screenshot, coordinate extraction | pdf.js, Vercel Blob |
| Analysis Engine | Paragraph flow, guideline compliance, adversarial review | Gemini API |
| Data Layer | Relational persistence, file storage, external lookups | PostgreSQL, S3/Blob |

### 1.3 Data Flow Between Components

```
                   User writes manuscript
                           |
                           v
              +------------------------+
              | Write Workspace        |
              | (TipTap Editor)        |
              +------------------------+
                   |              |
          Save version      Click "Map Evidence"
                   |              |
                   v              v
          +-------------+  +-------------------+
          | Document     |  | Evidence Mapping  |
          | Version DB   |  | Engine            |
          +-------------+  +-------------------+
                              |            |
                     Decompose claims   Search cited paper
                              |            |
                              v            v
                    +---------------+  +----------------+
                    | Claim         |  | PDF Pipeline   |
                    | Compiler      |  | (Download +    |
                    |               |  |  Parse)        |
                    +---------------+  +----------------+
                              |            |
                    Match claims to   Extract passage
                    cited passages    coordinates
                              |            |
                              v            v
                    +-------------------------------+
                    | EvidenceMapping Record         |
                    | - manuscriptSentence           |
                    | - citedPaper                    |
                    | - supportingPassage             |
                    | - pdfPage + coordinates         |
                    | - confidence score              |
                    +-------------------------------+
                              |
                    Human reviews + verifies
                              |
                              v
                    +-------------------------------+
                    | HumanVerification Record       |
                    | - userId                       |
                    | - status: APPROVED / REJECTED   |
                    | - notes                        |
                    +-------------------------------+
                              |
                    Export as evidence deck
                              |
                              v
                    +-------------------------------+
                    | Evidence Export Engine          |
                    | - PPTX slides                  |
                    | - PDF report                   |
                    | - DOCX appendix                |
                    +-------------------------------+
```

---

## 2. New System Components

### 2.1 PDF Processing Pipeline

#### 2.1.1 Purpose

The PDF pipeline downloads, caches, parses, and screenshots cited papers to
provide visual proof that citations actually support the manuscript's claims.

#### 2.1.2 Download Strategy

PDF acquisition uses a cascading fallback aligned with the existing full-text
resolver in `src/lib/providers/fulltext-resolver.ts`:

```
Priority Order:
  1. PMC (Open Access XML + associated PDF)
  2. Unpaywall (best OA location -> pdf_url)
  3. arXiv (always freely available as PDF)
  4. CORE (Open Access repository)
  5. Publisher direct (DOI redirect, may require license)
```

The download component requests the PDF binary from the resolved URL, validates
that the response is a valid PDF (checks `%PDF-` magic bytes), and stores the
file in the object store with a content-addressable key derived from the paper's
canonical ID.

```
PDF Key Format: pdfs/{canonicalPaperId}/{sha256_first16}.pdf
Screenshot Key: screenshots/{canonicalPaperId}/p{page}_{x}_{y}_{w}_{h}.png
```

#### 2.1.3 PDF Parsing

Server-side parsing extracts structured content from the PDF:

| Extraction Target | Method | Output |
|-------------------|--------|--------|
| Text by page | pdf-parse (pdfjs-dist on Node) | `PageText[]` with page numbers |
| Section boundaries | Heuristic heading detection + Gemini fallback | `SectionBoundary[]` |
| Figures and tables | Coordinate-based region detection | `FigureRegion[]` |
| Character positions | pdf.js `getTextContent()` viewport mapping | `CharPosition[]` |

The parser produces a `ParsedPdf` object:

```typescript
interface ParsedPdf {
  paperId: string;
  totalPages: number;
  pages: PdfPage[];
  sections: PdfSectionBoundary[];
  figures: PdfFigureRegion[];
}

interface PdfPage {
  pageNumber: number;        // 1-indexed
  text: string;              // full page text
  width: number;             // page width in points
  height: number;            // page height in points
  textItems: PdfTextItem[];  // positioned text items
}

interface PdfTextItem {
  text: string;
  x: number;       // left edge in points
  y: number;       // top edge in points
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
}

interface PdfSectionBoundary {
  heading: string;
  sectionType: "INTRODUCTION" | "METHODS" | "RESULTS" | "DISCUSSION"
             | "ABSTRACT" | "CONCLUSION" | "REFERENCES" | "OTHER";
  startPage: number;
  startY: number;
  endPage: number;
  endY: number;
}

interface PdfFigureRegion {
  label: string;           // "Figure 1", "Table 2"
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

#### 2.1.4 Page-Level Coordinate Extraction

When the Evidence Mapping Engine identifies a supporting passage, it needs to
map that passage back to a visual region in the PDF. The process:

1. Passage text is fuzzy-matched against `PdfTextItem[]` arrays on each page.
2. The matching text items' bounding boxes are merged into a single region.
3. A margin is added (16pt on each side) to produce a readable screenshot area.
4. The coordinates are stored as `PdfRegion` on the `EvidenceMapping` record.

```typescript
interface PdfRegion {
  page: number;
  x: number;         // left edge (points)
  y: number;         // top edge (points)
  width: number;     // region width (points)
  height: number;    // region height (points)
}
```

#### 2.1.5 Screenshot Generation

Screenshots are generated using pdf.js canvas rendering on the server:

1. Load PDF document with `pdfjs-dist`.
2. Render the target page to an OffscreenCanvas at 2x DPI (for Retina quality).
3. Crop the canvas to the specified `PdfRegion` with margin.
4. Export as PNG.
5. Upload to object storage.
6. Return the public URL.

For client-side preview, the same pdf.js is used in the browser to render the
page with a highlight overlay on the matching region.

#### 2.1.6 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Server PDF parsing | `pdfjs-dist` (Node.js build) | Same library client/server, well-maintained |
| Client PDF preview | `pdfjs-dist` (browser build) | Interactive highlighting, zoom, navigation |
| Screenshot rendering | `OffscreenCanvas` (Node) or `canvas` (npm) | Server-side PNG generation |
| Object storage | Vercel Blob | Integrated with Vercel, no extra infra for MVP |
| Fallback storage | S3-compatible (future) | For self-hosted or high-volume deployments |

#### 2.1.7 Storage Lifecycle

```
PDF downloaded -> stored in Blob -> PdfCache record created in DB
                                 -> TTL: 90 days from last access
                                 -> Re-downloaded on cache miss

Screenshot generated -> stored in Blob -> URL stored on EvidenceMapping
                                       -> TTL: same as parent PDF
                                       -> Regenerated on cache miss
```

---

### 2.2 Evidence Mapping Engine

#### 2.2.1 Purpose

The Evidence Mapping Engine is the core innovation of v2. It takes a manuscript
sentence and a cited paper's full text, then produces a structured proof that
the citation actually supports the claim being made.

#### 2.2.2 Input/Output Specification

```
Input:
  - manuscriptSentence: string       (the sentence from the manuscript)
  - manuscriptSection: SectionType   (INTRODUCTION, METHODS, etc.)
  - citedPaperId: string             (CanonicalPaper ID)
  - citedPaperFullText: ParsedPdf    (structured PDF content)
  - citedPaperSections: PaperSection[] (from fulltext-resolver)

Output:
  - EvidenceMapping {
      manuscriptSentenceText: string
      manuscriptSentenceIndex: number
      manuscriptSection: SectionType
      citedPaperId: string
      atomicClaims: AtomicClaim[]
      supportingPassages: SupportingPassage[]
      overallSupportLabel: SupportLabel
      overallConfidence: number
      pdfRegions: PdfRegion[]
      screenshotUrls: string[]
    }
```

#### 2.2.3 Processing Steps

```
Step 1: Decompose manuscript sentence into atomic claims
        Uses existing claim-compiler.ts logic
        Input:  "Transformer models achieve 95% accuracy on BLEU scores,
                 outperforming RNN-based approaches by 12%."
        Output: [
          { claim: "Transformer models achieve 95% accuracy on BLEU", type: "SPECIFIC_RESULT" },
          { claim: "Transformers outperform RNN by 12%", type: "COMPARISON" }
        ]

Step 2: Search cited paper's full text for supporting passages
        For each atomic claim:
          a. Generate search queries from the claim
          b. Semantic search across all sections of the cited paper
          c. Rank candidate passages by relevance
          d. Select top 1-3 passages per claim
        Uses Gemini API with structured output

Step 3: Map each claim to specific location in cited paper
        For each supporting passage:
          a. Identify the section (Introduction, Results, etc.)
          b. Locate the page number
          c. Locate the paragraph within the page
        This uses the ParsedPdf section boundaries and page text

Step 4: Extract PDF region coordinates for screenshot
        For each supporting passage:
          a. Fuzzy-match passage text against PdfTextItem positions
          b. Compute bounding box with margin
          c. Store PdfRegion coordinates

Step 5: Generate confidence score
        Scoring rubric:
          0.90-1.00: Exact quote or near-verbatim match
          0.75-0.89: Clear semantic support, same data/conclusion
          0.60-0.74: Partial support, related but not exact
          0.40-0.59: Tangential support, requires interpretation
          0.00-0.39: Weak or no support
        Score is adjusted by evidence tier:
          FULLTEXT: no adjustment
          ABSTRACT_ONLY: cap at 0.75 (aligns with existing logic)
```

#### 2.2.4 Gemini Prompt Design

The mapping engine uses a two-phase Gemini call:

**Phase 1: Claim-to-Passage Matching**

```
System: You are an expert evidence mapper for academic papers. Given a
manuscript sentence and a cited paper's full text, find the specific
passages in the cited paper that support each claim in the manuscript
sentence.

Rules:
- Extract verbatim passages from the cited paper (do not paraphrase)
- Each passage must be at least 1 sentence and at most 3 sentences
- If a claim is not supported by the cited paper, say so explicitly
- Rate confidence based on how directly the passage supports the claim
- Distinguish between SUPPORTED, PARTIAL, CONTRADICTED, INSUFFICIENT
```

**Phase 2: Coordinate Resolution**

This phase runs locally (no LLM call) using text matching against `ParsedPdf`
data. The fuzzy matcher uses Levenshtein distance with a threshold of 0.85
similarity to handle OCR artifacts and minor text extraction differences.

#### 2.2.5 Output Data Structure

```typescript
interface AtomicClaim {
  text: string;
  type: "SPECIFIC_RESULT" | "COMPARISON" | "METHODOLOGY" | "GENERAL_FINDING";
  supportStatus: SupportLabel;    // reuses existing type
  supportingPassageIds: string[];
}

interface SupportingPassage {
  id: string;
  text: string;                    // verbatim from cited paper
  sectionLabel: string;            // "Results", "Methods", etc.
  sectionType: string;             // "RESULTS", "METHODS", etc.
  pageNumber: number;
  paragraphIndex: number;
  pdfRegion: PdfRegion;
  screenshotUrl: string | null;    // null until screenshot is generated
  matchConfidence: number;
}
```

---

### 2.3 Paragraph Flow Analyzer

#### 2.3.1 Purpose

Analyzes the logical flow of a manuscript to detect structural issues, missing
transitions, and areas where literature coverage is insufficient.

#### 2.3.2 Input/Output Specification

```
Input:
  - fullManuscriptText: string
  - sectionBoundaries: { type: SectionType, startIndex: number, endIndex: number }[]
  - existingCitations: ManuscriptCitation[] (for context)

Output:
  - FlowAnalysis {
      paragraphs: ParagraphRole[]
      transitions: TransitionAssessment[]
      issues: FlowIssue[]
      missingLiteratureAreas: string[]
    }
```

#### 2.3.3 Paragraph Role Classification

Each paragraph is classified into one of these roles:

| Role | Description | Typical Section |
|------|-------------|-----------------|
| BACKGROUND | Establishes the field context | Introduction |
| PROBLEM_STATEMENT | Identifies the research gap or question | Introduction |
| PRIOR_WORK | Reviews existing literature | Introduction, Related Work |
| GAP | Identifies what is missing in prior work | Introduction |
| APPROACH | Describes the proposed method | Methods, Introduction |
| CONTRIBUTION | States what this paper adds | Introduction |
| METHODOLOGY | Describes specific procedures | Methods |
| RESULT | Reports findings | Results |
| INTERPRETATION | Explains what results mean | Discussion |
| LIMITATION | Acknowledges constraints | Discussion |
| FUTURE_WORK | Suggests next steps | Discussion |
| TRANSITION | Bridges between topics | Any |

#### 2.3.4 Transition Quality Assessment

```typescript
interface TransitionAssessment {
  fromParagraphIndex: number;
  toParagraphIndex: number;
  quality: "SMOOTH" | "ACCEPTABLE" | "ABRUPT" | "MISSING";
  topicShift: boolean;
  bridgeSuggestion: string | null;
}
```

Quality is assessed based on:
- Topic continuity between adjacent paragraphs
- Presence of transition phrases or connectors
- Logical progression of ideas
- Whether the paragraph role sequence makes sense

#### 2.3.5 Missing Literature Detection

The analyzer identifies areas where the manuscript makes claims or references
topics without adequate literature coverage:

```typescript
interface MissingLiteratureArea {
  paragraphIndex: number;
  topic: string;
  reason: string;               // "No citations for comparison claim"
  suggestedSearchQuery: string;  // Pre-generated query for evidence discovery
  severity: "HIGH" | "MEDIUM" | "LOW";
}
```

#### 2.3.6 Technology

- Uses Gemini API with few-shot prompting
- Section boundaries from existing `DocumentVersion.sections` JSON field
- Integrates with existing coverage data from `ManuscriptClaimSupport`

---

### 2.4 Guideline Compliance Checker

#### 2.4.1 Purpose

Validates manuscripts against reporting guidelines used in medical AI research
(CONSORT-AI, TRIPOD-AI, SPIRIT-AI, STARD-AI, CLAIM, PROBAST, etc.).

#### 2.4.2 Supported Guidelines

| Guideline | Target Research Design | Checklist Items |
|-----------|----------------------|-----------------|
| CONSORT-AI | Randomized controlled trials with AI | ~40 items |
| TRIPOD-AI | Prediction model studies | ~30 items |
| SPIRIT-AI | Trial protocols with AI | ~35 items |
| STARD-AI | Diagnostic accuracy studies | ~30 items |
| CLAIM | Radiological AI studies | ~42 items |
| PROBAST | Prediction model risk of bias | ~20 domains |

#### 2.4.3 Processing Steps

```
Step 1: User selects research design type
        -> System maps to applicable guidelines

Step 2: System loads guideline checklist
        Checklists are stored as structured JSON in:
        src/lib/evidence/guidelines/{guideline-id}.json

Step 3: For each checklist item:
        a. Generate a search pattern from the item's requirement
        b. Scan manuscript text for fulfillment evidence
        c. Classify: FULFILLED | PARTIALLY_FULFILLED | NOT_FOUND | NOT_APPLICABLE
        d. If fulfilled, record the location in the manuscript
        e. If not fulfilled, generate a suggestion

Step 4: Generate compliance report
```

#### 2.4.4 Compliance Report Structure

```typescript
interface ComplianceReport {
  guideline: string;                   // "CONSORT-AI"
  version: string;                     // "2020"
  researchDesign: string;              // "RCT with AI intervention"
  overallComplianceRate: number;       // 0.0 - 1.0
  items: ComplianceItem[];
  summary: string;
  criticalMissing: ComplianceItem[];   // Items marked as critical and NOT_FOUND
}

interface ComplianceItem {
  id: string;                          // "1a"
  section: string;                     // "Title and abstract"
  requirement: string;                 // "Identify the study as an RCT..."
  status: "FULFILLED" | "PARTIALLY_FULFILLED" | "NOT_FOUND" | "NOT_APPLICABLE";
  manuscriptLocation?: {
    sectionType: SectionType;
    paragraphIndex: number;
    sentenceIndex: number;
    text: string;                      // matching text from manuscript
  };
  suggestion?: string;                 // generated improvement suggestion
  priority: "CRITICAL" | "IMPORTANT" | "OPTIONAL";
}
```

---

### 2.5 Evidence Export Engine

#### 2.5.1 Purpose

Generates exportable documentation that proves each citation in the manuscript
is supported by the cited paper, with visual evidence.

#### 2.5.2 PowerPoint (PPTX) Export

Each slide follows this layout:

```
+------------------------------------------------------------------+
|                    Evidence Documentation                         |
|                    [Document Title] - Slide N/M                   |
+------------------------------------------------------------------+
|                                                                    |
|  MANUSCRIPT SENTENCE                                               |
|  "Transformer models achieve 95% accuracy on BLEU scores,         |
|   outperforming RNN-based approaches by 12% [vaswani2017]."       |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  SUPPORTING EVIDENCE                                               |
|  +--------------------------------------------------------------+ |
|  | [PDF Screenshot: highlighted passage from cited paper]        | |
|  |                                                               | |
|  | "Our model achieves a BLEU score of 28.4, which is 2.0       | |
|  |  BLEU better than the best results previously reported..."    | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  Citation: Vaswani et al. (2017)                                   |
|  Journal: NeurIPS                                                  |
|  DOI: 10.5555/3295222.3295349                                      |
|  Page: 8, Section: Results                                         |
|  Confidence: 0.92 (HIGH)                                           |
|  Verified by: Dr. Smith on 2026-03-15                              |
|                                                                    |
+------------------------------------------------------------------+
```

Technology: `pptxgenjs` (already compatible with the Node.js runtime).

#### 2.5.3 PDF Export

Same structure as PPTX but rendered as a multi-page PDF document. Each
evidence mapping occupies one page. The PDF includes:

- Title page with document summary and export metadata
- Table of contents listing all citations
- One page per evidence mapping (manuscript sentence + PDF screenshot + metadata)
- Appendix: Full bibliography in the selected citation style
- Appendix: Compliance report (if generated)

Technology: Server-side HTML-to-PDF rendering using the existing `docx` library
pattern, or `@react-pdf/renderer` for React-based PDF generation.

#### 2.5.4 Export Data Flow

```
EvidenceMapping records
  + HumanVerification records
  + PdfCache screenshot URLs
  + CanonicalPaper metadata
  + ManuscriptCitation cite keys
        |
        v
  Evidence Export Engine
        |
        +---> PPTX file (pptxgenjs)
        |
        +---> PDF report (@react-pdf/renderer)
        |
        +---> DOCX appendix (docx library, extends existing export)
        |
        +---> BibTeX bibliography (existing bibtex.ts)
```

---

## 3. Data Model Extensions

### 3.1 New Models

#### 3.1.1 PdfCache

Tracks downloaded and parsed PDF files for cited papers.

```prisma
model PdfCache {
  id              String          @id @default(cuid())
  paperId         String
  paper           CanonicalPaper  @relation(fields: [paperId], references: [id], onDelete: Cascade)
  sourceUrl       String          @db.Text    // URL the PDF was downloaded from
  sourceProvider  String                       // "pmc" | "unpaywall" | "arxiv" | "core"
  blobKey         String          @unique      // key in Vercel Blob / S3
  blobUrl         String          @db.Text     // public URL for access
  fileSizeBytes   Int
  totalPages      Int
  parsedSections  Json?                        // PdfSectionBoundary[] cached
  parsedAt        DateTime?                    // null if not yet parsed
  lastAccessedAt  DateTime        @default(now())
  createdAt       DateTime        @default(now())

  evidenceMappings EvidenceMapping[]

  @@unique([paperId])
  @@index([lastAccessedAt])
}
```

#### 3.1.2 EvidenceMapping

Core v2 model. Maps a manuscript sentence's atomic claims to specific passages
in a cited paper, with PDF coordinates for screenshot generation.

```prisma
model EvidenceMapping {
  id                     String          @id @default(cuid())
  documentId             String
  document               Document        @relation(fields: [documentId], references: [id], onDelete: Cascade)
  manuscriptCitationId   String
  manuscriptCitation     ManuscriptCitation @relation(fields: [manuscriptCitationId], references: [id], onDelete: Cascade)
  pdfCacheId             String?
  pdfCache               PdfCache?       @relation(fields: [pdfCacheId], references: [id], onDelete: SetNull)

  // Manuscript side
  sectionType            String          // "INTRODUCTION" | "METHODS" | etc.
  sentenceIndex          Int
  sentenceText           String          @db.Text
  atomicClaims           Json            // AtomicClaim[]

  // Cited paper side
  supportingPassages     Json            // SupportingPassage[]
  overallSupportLabel    String          // "SUPPORTED" | "PARTIAL" | "CONTRADICTED" | "INSUFFICIENT"
  overallConfidence      Float

  // PDF regions and screenshots
  pdfRegions             Json?           // PdfRegion[]
  screenshotUrls         String[]        // URLs in Vercel Blob / S3

  // Status tracking
  status                 String          @default("PENDING")
                                          // "PENDING" | "MAPPED" | "SCREENSHOT_READY" | "VERIFIED" | "REJECTED"
  mappedAt               DateTime?
  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt

  humanVerifications     HumanVerification[]

  @@index([documentId])
  @@index([manuscriptCitationId])
  @@index([status])
}
```

#### 3.1.3 HumanVerification

Records human approval or rejection of an evidence mapping.

```prisma
model HumanVerification {
  id                String          @id @default(cuid())
  evidenceMappingId String
  evidenceMapping   EvidenceMapping @relation(fields: [evidenceMappingId], references: [id], onDelete: Cascade)
  userId            String
  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  status            String          // "APPROVED" | "REJECTED" | "NEEDS_REVISION"
  notes             String?         @db.Text
  verifiedAt        DateTime        @default(now())

  @@index([evidenceMappingId])
  @@index([userId])
}
```

#### 3.1.4 ComplianceCheck

Stores guideline compliance results per document.

```prisma
model ComplianceCheck {
  id              String          @id @default(cuid())
  documentId      String
  document        Document        @relation(fields: [documentId], references: [id], onDelete: Cascade)
  guideline       String          // "CONSORT-AI" | "TRIPOD-AI" | etc.
  version         String          // guideline version
  researchDesign  String          // "RCT" | "Prediction model" | etc.
  overallRate     Float           // 0.0 - 1.0
  items           Json            // ComplianceItem[]
  summary         String          @db.Text
  createdAt       DateTime        @default(now())

  @@index([documentId])
  @@index([documentId, guideline])
}
```

#### 3.1.5 ParagraphAnalysis

Stores paragraph flow analysis results per document version.

```prisma
model ParagraphAnalysis {
  id               String          @id @default(cuid())
  documentId       String
  document         Document        @relation(fields: [documentId], references: [id], onDelete: Cascade)
  versionNumber    Int             // links to DocumentVersion.versionNumber
  paragraphs       Json            // ParagraphRole[]
  transitions      Json            // TransitionAssessment[]
  issues           Json            // FlowIssue[]
  missingLiterature Json           // MissingLiteratureArea[]
  createdAt        DateTime        @default(now())

  @@index([documentId])
  @@unique([documentId, versionNumber])
}
```

### 3.2 Model Relationships

#### 3.2.1 Relationship Diagram

```
                                    User
                                     |
                        +------------+------------+
                        |                         |
                   Document               HumanVerification
                     |    \                       |
           +---------+-----+------+               |
           |         |     |      |               |
    DocVersion  MsCitation MsClaim ComplianceCheck|
           |         |     |                      |
           |    +----+----+                       |
           |    |         |                       |
           | MsCitAnchor  MsClaimSupport          |
           |    |                                 |
           | EvidenceMapping----------------------+
           |    |         |
           | PdfCache  CanonicalPaper
           |              |
           |         +----+--------+
           |         |    |        |
    ParagraphAnalysis|  PaperId  ProviderSnapshot
                     |
               +-----+------+
               |     |      |
          EvSnippet ClaimCard PaperRelation
               |     |
          ClaimCardEvidence
```

#### 3.2.2 New Relations on Existing Models

The following existing models gain new relations:

**Document** (add relations):
```
  evidenceMappings    EvidenceMapping[]
  complianceChecks    ComplianceCheck[]
  paragraphAnalyses   ParagraphAnalysis[]
```

**ManuscriptCitation** (add relation):
```
  evidenceMappings    EvidenceMapping[]
```

**CanonicalPaper** (add relation):
```
  pdfCache            PdfCache?
```

**User** (add relation):
```
  humanVerifications  HumanVerification[]
```

---

## 4. API Design

### 4.1 New API Endpoints

#### 4.1.1 Evidence Mapping

**POST /api/evidence/map**

Creates evidence mappings between manuscript sentences and cited paper passages.

Request:
```json
{
  "documentId": "doc_123",
  "manuscriptCitationId": "mc_456",
  "sentenceIndex": 4,
  "sentenceText": "Transformer models achieve 95% accuracy on BLEU scores.",
  "sectionType": "RESULTS"
}
```

Response:
```json
{
  "evidenceMappingId": "em_789",
  "atomicClaims": [
    {
      "text": "Transformer models achieve 95% accuracy on BLEU",
      "type": "SPECIFIC_RESULT",
      "supportStatus": "SUPPORTED",
      "supportingPassageIds": ["sp_001"]
    }
  ],
  "supportingPassages": [
    {
      "id": "sp_001",
      "text": "Our model achieves a BLEU score of 28.4...",
      "sectionLabel": "Results",
      "sectionType": "RESULTS",
      "pageNumber": 8,
      "paragraphIndex": 2,
      "matchConfidence": 0.92
    }
  ],
  "overallSupportLabel": "SUPPORTED",
  "overallConfidence": 0.92,
  "status": "MAPPED"
}
```

Processing time target: <5s per sentence.

---

**GET /api/evidence/mappings?documentId=...**

Returns all evidence mappings for a document.

Response:
```json
{
  "mappings": [
    {
      "id": "em_789",
      "sectionType": "RESULTS",
      "sentenceIndex": 4,
      "sentenceText": "Transformer models achieve 95%...",
      "citedPaper": {
        "id": "paper_123",
        "title": "Attention Is All You Need",
        "authors": "Vaswani et al.",
        "year": 2017,
        "citeKey": "vaswani2017attention"
      },
      "overallSupportLabel": "SUPPORTED",
      "overallConfidence": 0.92,
      "status": "VERIFIED",
      "screenshotUrls": ["https://blob.vercel-storage.com/..."],
      "humanVerification": {
        "status": "APPROVED",
        "verifiedBy": "Dr. Smith",
        "verifiedAt": "2026-03-15T10:30:00Z"
      }
    }
  ],
  "summary": {
    "total": 23,
    "supported": 18,
    "partial": 3,
    "unsupported": 1,
    "pending": 1,
    "verified": 15
  }
}
```

---

**POST /api/evidence/verify-human**

Records human verification of an evidence mapping.

Request:
```json
{
  "evidenceMappingId": "em_789",
  "status": "APPROVED",
  "notes": "Confirmed: the passage directly states the BLEU score improvement."
}
```

Response:
```json
{
  "verificationId": "hv_001",
  "evidenceMappingId": "em_789",
  "status": "APPROVED",
  "evidenceMappingStatus": "VERIFIED"
}
```

---

#### 4.1.2 PDF Management

**POST /api/pdf/download**

Downloads and caches a cited paper's PDF.

Request:
```json
{
  "canonicalPaperId": "paper_123"
}
```

Response:
```json
{
  "pdfCacheId": "pdf_001",
  "blobUrl": "https://blob.vercel-storage.com/pdfs/paper_123/abc123.pdf",
  "totalPages": 12,
  "fileSizeBytes": 1458923,
  "sourceProvider": "pmc",
  "parsedSections": [
    { "heading": "Abstract", "sectionType": "ABSTRACT", "startPage": 1 },
    { "heading": "Introduction", "sectionType": "INTRODUCTION", "startPage": 1 },
    { "heading": "Methods", "sectionType": "METHODS", "startPage": 3 }
  ]
}
```

Processing time target: <10s per paper.

---

**GET /api/pdf/screenshot?evidenceMappingId=...&passageIndex=...**

Generates or retrieves a screenshot of a specific PDF region.

Response:
```json
{
  "screenshotUrl": "https://blob.vercel-storage.com/screenshots/...",
  "pdfRegion": {
    "page": 8,
    "x": 72,
    "y": 340,
    "width": 468,
    "height": 120
  },
  "passageText": "Our model achieves a BLEU score of 28.4...",
  "cached": true
}
```

Processing time target: <2s per region.

---

#### 4.1.3 Analysis

**POST /api/analysis/paragraph-flow**

Analyzes paragraph flow for the current document.

Request:
```json
{
  "documentId": "doc_123",
  "versionNumber": 5
}
```

Response:
```json
{
  "paragraphs": [
    {
      "index": 0,
      "role": "BACKGROUND",
      "topics": ["deep learning", "medical imaging"],
      "sectionType": "INTRODUCTION",
      "sentenceCount": 4,
      "citationCount": 3
    },
    {
      "index": 1,
      "role": "PRIOR_WORK",
      "topics": ["CNN architectures", "transfer learning"],
      "sectionType": "INTRODUCTION",
      "sentenceCount": 5,
      "citationCount": 6
    }
  ],
  "transitions": [
    {
      "fromParagraphIndex": 0,
      "toParagraphIndex": 1,
      "quality": "SMOOTH",
      "topicShift": false,
      "bridgeSuggestion": null
    },
    {
      "fromParagraphIndex": 2,
      "toParagraphIndex": 3,
      "quality": "ABRUPT",
      "topicShift": true,
      "bridgeSuggestion": "Add a transition sentence connecting the limitations of prior approaches to your proposed method."
    }
  ],
  "issues": [
    {
      "type": "MISSING_TRANSITION",
      "location": { "fromParagraph": 2, "toParagraph": 3 },
      "severity": "MEDIUM",
      "suggestion": "Consider adding a bridging paragraph."
    }
  ],
  "missingLiteratureAreas": [
    {
      "paragraphIndex": 3,
      "topic": "data augmentation for small datasets",
      "reason": "Claim about data scarcity lacks supporting citations",
      "suggestedSearchQuery": "data augmentation techniques small medical imaging datasets",
      "severity": "HIGH"
    }
  ]
}
```

Processing time target: <3s for full document.

---

**POST /api/analysis/compliance**

Checks manuscript against a reporting guideline.

Request:
```json
{
  "documentId": "doc_123",
  "guideline": "CONSORT-AI",
  "researchDesign": "RCT with AI diagnostic tool"
}
```

Response:
```json
{
  "complianceCheckId": "cc_001",
  "guideline": "CONSORT-AI",
  "version": "2020",
  "overallRate": 0.72,
  "items": [
    {
      "id": "1a",
      "section": "Title and abstract",
      "requirement": "Identification as a randomised trial in the title",
      "status": "FULFILLED",
      "manuscriptLocation": {
        "sectionType": "ABSTRACT",
        "paragraphIndex": 0,
        "text": "We conducted a randomised controlled trial..."
      },
      "priority": "CRITICAL"
    },
    {
      "id": "5",
      "section": "Interventions",
      "requirement": "Describe the AI intervention including version and how it was integrated into clinical workflow",
      "status": "NOT_FOUND",
      "suggestion": "Add a paragraph in the Methods section describing the AI model version, training data, and clinical integration workflow.",
      "priority": "CRITICAL"
    }
  ],
  "summary": "29 of 40 items fulfilled. 5 critical items are missing.",
  "criticalMissing": ["5", "6a", "11a", "17b", "AI-1"]
}
```

---

#### 4.1.4 Export

**GET /api/export/evidence-pptx?documentId=...**

Generates and returns a PowerPoint file with evidence documentation.

Query parameters:
- `documentId` (required)
- `sections` (optional, comma-separated: "INTRODUCTION,RESULTS")
- `includeUnverified` (optional, default: false)
- `includeCompliance` (optional, default: false)

Response: Binary PPTX file with `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`

---

**GET /api/export/evidence-pdf?documentId=...**

Generates and returns a PDF report with evidence documentation.

Same query parameters as PPTX.

Response: Binary PDF file with `Content-Type: application/pdf`

---

### 4.2 Modified Endpoints

#### 4.2.1 Existing Evidence Endpoints

**POST /api/evidence/extract** (enhanced)

Current behavior: Extracts evidence snippets and claim cards from a paper's
full text (via fulltext-resolver cascade).

Enhancement: After extraction, if a PdfCache exists for the paper, also
generate `PdfRegion` coordinates for each extracted snippet. Store these
coordinates on `EvidenceSnippet` (new optional field).

**POST /api/evidence/verify** (enhanced)

Current behavior: Verifies a paper candidate, creates CanonicalPaper, and
extracts evidence.

Enhancement: After verification, trigger PDF download in the background.
Return a `pdfStatus` field indicating whether the PDF is available:

```json
{
  "paper": { ... },
  "evidenceSnippets": [ ... ],
  "claimCards": [ ... ],
  "pdfStatus": "DOWNLOADING" | "AVAILABLE" | "UNAVAILABLE"
}
```

**GET /api/evidence/coverage** (enhanced)

Current behavior: Returns sentence-level coverage status.

Enhancement: Include evidence mapping status per sentence:

```json
{
  "sentences": [
    {
      "index": 0,
      "status": "GROUNDED",
      "evidenceMappingStatus": "VERIFIED",
      "hasScreenshot": true
    }
  ]
}
```

---

## 5. UI Architecture

### 5.1 Document Workspace Redesign

The document workspace adds a tab-based navigation system while preserving the
existing bilingual editor as the primary surface.

#### 5.1.1 Tab Structure

```
+------------------------------------------------------------------+
| [Back]  Document Title    [Write] [Evidence] [Review] [Export]    |
+------------------------------------------------------------------+
| Abstract | Introduction | Methods | Results | Discussion | Refs  |
+------------------------------------------------------------------+
|                                                                    |
|  Tab-specific content area                                         |
|                                                                    |
+------------------------------------------------------------------+
```

| Tab | Content | Primary Action |
|-----|---------|----------------|
| Write | Bilingual editor (existing + section rail) | Edit manuscript |
| Evidence | Split view: manuscript + evidence mappings | Map & verify evidence |
| Review | Findings list + manuscript preview | Resolve issues |
| Export | Export options + preview | Generate documents |

#### 5.1.2 Write Tab

Preserves the existing editor with enhancements:

```
+------------------------------------------------------------------+
| [Thinking Pane (JA)]   | [Manuscript Pane (EN)]                  |
|                        |                                          |
| Japanese draft text    | English manuscript with:                 |
|                        |   - Sentence coverage dots in gutter     |
|                        |   - Citation chips inline                |
|                        |   - Paragraph action toolbar on hover    |
|                        |                                          |
| [Sync ->]  [<- Sync]  | [Find Citations] [Check Evidence]        |
+------------------------------------------------------------------+
```

The Write tab is identical to the current editor layout with three additions:
1. Section rail (horizontal tabs under the header)
2. Sentence coverage indicators in the gutter
3. Paragraph-level action toolbar on hover

### 5.2 Evidence Tab

The Evidence tab is the primary v2 addition. It shows a split view with the
manuscript on the left and evidence mappings on the right.

#### 5.2.1 Layout

```
+------------------------------------------------------------------+
| Evidence Summary:  23 sentences | 18 supported | 3 partial | 1 gap|
+------------------------------------------------------------------+
| MANUSCRIPT (read-only)         | EVIDENCE MAPPINGS                |
|                                |                                   |
| Introduction                   | [Citation: Vaswani et al. 2017]   |
|                                | Status: VERIFIED                  |
| [*] Transformer models have    | +-------------------------------+ |
|     revolutionized NLP...      | | Manuscript Sentence:          | |
|                                | | "Transformer models achieve   | |
| [*] They achieve 95% accuracy  | |  95% accuracy on BLEU..."     | |
|     on BLEU scores...          | +-------------------------------+ |
|                                | | Supporting Passage:           | |
| [!] However, their             | | "Our model achieves a BLEU    | |
|     computational cost...      | |  score of 28.4, which is..."  | |
|                                | +-------------------------------+ |
| [?] Recent work has shown      | | [PDF Screenshot]              | |
|     promising approaches...    | | Page 8, Results section       | |
|                                | +-------------------------------+ |
|                                | | Confidence: 0.92 (HIGH)       | |
|                                | | [x] Human Verified            | |
|                                | | Verified by: Dr. Smith        | |
|                                | +-------------------------------+ |
|                                |                                   |
| Legend:                        | [Map Evidence] [Download PDF]     |
| [*] Verified  [!] Partial     | [Export Slide]                    |
| [?] Pending   [-] No mapping  |                                   |
+------------------------------------------------------------------+
```

#### 5.2.2 Evidence Status Indicators

Each manuscript sentence shows one of these status icons in the gutter:

| Icon | Color | Meaning |
|------|-------|---------|
| Filled circle | Green | Evidence mapped and human-verified |
| Half circle | Amber | Evidence mapped but not yet verified |
| Question mark | Blue | Evidence mapping pending |
| Warning | Red | No supporting evidence found |
| Dash | Gray | No citation in this sentence |

#### 5.2.3 Evidence Mapping Card

When the user clicks a sentence, the right panel shows:

1. **Manuscript Sentence** -- the exact sentence text
2. **Atomic Claims** -- decomposed claims with individual support status
3. **Supporting Passages** -- verbatim text from the cited paper
4. **PDF Screenshot** -- visual proof with highlighted passage
5. **Metadata** -- page number, section, citation key, DOI
6. **Confidence Score** -- numerical and categorical (HIGH/MEDIUM/LOW)
7. **Human Verification** -- checkbox with reviewer name and date
8. **Actions** -- Re-map, View PDF, Export this slide

#### 5.2.4 PDF Preview

Clicking "View PDF" opens an inline PDF viewer using pdf.js:

```
+------------------------------------------------------------------+
| PDF Viewer: "Attention Is All You Need"                  [Close]  |
+------------------------------------------------------------------+
| Page 8 of 15                                [<] [>] [Zoom +/-]   |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |                                                                | |
|  |  ... surrounding text ...                                      | |
|  |                                                                | |
|  |  +----------------------------------------------------------+ | |
|  |  | "Our model achieves a BLEU score of 28.4, which is 2.0   | | |
|  |  |  BLEU better than the best results previously reported   | | |
|  |  |  on the WMT 2014 English-to-French translation task."    | | |
|  |  +----------------------------------------------------------+ | |
|  |  ^ highlighted region                                         | |
|  |                                                                | |
|  |  ... surrounding text ...                                      | |
|  |                                                                | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### 5.3 Evidence Documentation View

Accessible via the Evidence tab's "All Citations" button, this view provides
a comprehensive overview of all citations and their evidence status.

```
+------------------------------------------------------------------+
| Evidence Documentation                                            |
| 12 citations | 9 verified | 2 partial | 1 missing                |
+------------------------------------------------------------------+
| Citation          | Sentences | Evidence | Status     | Action    |
|-------------------|-----------|----------|------------|-----------|
| Vaswani 2017      | 3         | 3/3      | VERIFIED   | [View]    |
| Devlin 2019       | 2         | 2/2      | VERIFIED   | [View]    |
| Brown 2020        | 4         | 3/4      | PARTIAL    | [Map]     |
| Liu 2024          | 1         | 0/1      | MISSING    | [Map]     |
+------------------------------------------------------------------+
|                                                                    |
| Selected: Vaswani 2017 - "Attention Is All You Need"              |
|                                                                    |
| Sentence 1: "Transformer models achieve 95%..."                   |
|   [PDF Screenshot] Page 8, Results                                |
|   Confidence: 0.92 | Verified by Dr. Smith                       |
|                                                                    |
| Sentence 2: "The attention mechanism allows..."                   |
|   [PDF Screenshot] Page 3, Introduction                           |
|   Confidence: 0.88 | Verified by Dr. Smith                       |
|                                                                    |
| [x] All evidence verified                                         |
|                                                                    |
| [Export PPTX] [Export PDF] [Export BibTeX]                         |
+------------------------------------------------------------------+
```

### 5.4 Paragraph Flow View

Accessible via the Review tab, this view shows the logical structure of the
manuscript.

```
+------------------------------------------------------------------+
| Paragraph Flow Analysis                                           |
| Introduction: 5 paragraphs | 2 issues found                      |
+------------------------------------------------------------------+
|                                                                    |
| [BACKGROUND] ---- [PRIOR_WORK] ---- [PRIOR_WORK]                 |
|    Para 1            Para 2            Para 3                      |
|       \                 \                 \                        |
|      Smooth           Smooth           ABRUPT  <-- Issue           |
|                                           |                        |
| [GAP] ---------- [CONTRIBUTION]                                   |
|  Para 4              Para 5                                        |
|       \                                                            |
|      Smooth                                                        |
|                                                                    |
+------------------------------------------------------------------+
| Issues:                                                            |
|                                                                    |
| 1. ABRUPT transition between Para 3 and Para 4                    |
|    "Topic shifts from CNN architectures to data augmentation      |
|     without a bridging sentence."                                  |
|    Suggestion: "Add a transition connecting the limitations of     |
|     existing architectures to the data scarcity problem."          |
|    [Jump to paragraph] [Apply suggestion]                          |
|                                                                    |
| 2. Missing literature: "data augmentation for medical imaging"     |
|    Para 4 claims data scarcity is a barrier but cites no papers.   |
|    [Search for citations]                                          |
+------------------------------------------------------------------+
```

### 5.5 Compliance Dashboard

Accessible via the Review tab's "Compliance" sub-tab.

```
+------------------------------------------------------------------+
| Guideline Compliance: CONSORT-AI 2020                             |
| Overall: 72% (29/40 items)                                        |
| [Change guideline v]                                              |
+------------------------------------------------------------------+
| Category           | Status                                       |
|                    | [===...............] 72%                      |
+------------------------------------------------------------------+
| Title & Abstract   | 2/2  [==] 100%  All fulfilled                |
| Introduction       | 2/2  [==] 100%  All fulfilled                |
| Methods            | 12/18 [========....] 67%  6 missing           |
|   > 5. Interventions  NOT_FOUND  CRITICAL                         |
|     "Describe the AI intervention including version..."            |
|     [Jump to Methods] [Generate template]                          |
|   > 6a. Outcomes      NOT_FOUND  CRITICAL                         |
|     "Completely define pre-specified primary outcomes..."          |
|     [Jump to Methods] [Generate template]                          |
| Results            | 8/10 [========..] 80%  2 missing             |
| Discussion         | 5/8  [=====...] 63%   3 missing              |
+------------------------------------------------------------------+
| [Export compliance report]                                         |
+------------------------------------------------------------------+
```

---

## 6. Security and Privacy

### 6.1 PDF Storage Security

- All PDF files are stored with private access in Vercel Blob.
- Access requires a signed URL generated per-request, valid for 15 minutes.
- No direct public URLs are stored; the application generates signed URLs on
  demand through API endpoints.
- PDF files are only accessible to the document owner and authorized collaborators.

### 6.2 Data Access Control

```
Access Control Matrix:

Resource              | Owner | Collaborator (edit) | Collaborator (view)
----------------------|-------|--------------------|--------------------|
Document              | RWD   | RW                 | R                  |
EvidenceMapping       | RWD   | RW                 | R                  |
HumanVerification     | RW    | RW                 | R                  |
PdfCache              | R     | R                  | R                  |
ComplianceCheck       | RWD   | R                  | R                  |
Export files           | RW    | R                  | R                  |

R = Read, W = Write, D = Delete
```

### 6.3 AI Training Exclusion

- All manuscript text sent to Gemini API uses the `user_content_in_training: false`
  setting via the Vercel AI SDK configuration.
- PDF content is processed ephemerally; only extracted passages are stored, not
  full PDF text.
- The privacy policy must state that research data is not used for model training.

### 6.4 HIPAA Considerations

- If manuscripts contain Protected Health Information (PHI), the system must:
  - Not store PHI in log files or analytics events
  - Encrypt all database fields containing manuscript text at rest (Neon provides
    this by default)
  - Ensure Vercel Blob storage is configured with encryption at rest
  - Provide a data deletion mechanism per user request
- HIPAA compliance is a future consideration; the current system is not
  HIPAA-certified but follows security best practices.

### 6.5 Secret Management

- All API keys (Gemini, Stripe, etc.) are stored in Vercel Environment Variables.
- No secrets in code or configuration files.
- PDF download credentials (if needed for publisher access) are stored as
  encrypted environment variables.
- Object storage credentials use Vercel's built-in Blob integration (no
  separate key management needed for MVP).

---

## 7. Performance Requirements

### 7.1 Response Time Targets

| Operation | Target | Max Acceptable | Notes |
|-----------|--------|---------------|-------|
| PDF download | <8s | <15s | Depends on source; PMC fastest |
| PDF parsing | <3s | <8s | Depends on page count |
| Evidence mapping (per sentence) | <5s | <10s | Single Gemini API call |
| Screenshot generation | <2s | <5s | Per region |
| Paragraph flow analysis | <3s | <8s | Full document |
| Compliance check | <5s | <12s | Depends on guideline size |
| PPTX export | <5s | <15s | Depends on citation count |
| PDF export | <8s | <20s | Depends on page count |

### 7.2 Concurrency

- Evidence mapping supports batch processing: up to 4 sentences mapped in
  parallel (matching the existing translation parallelism).
- PDF downloads are serialized per paper to avoid duplicate downloads.
- Screenshot generation is parallelized: up to 6 regions rendered simultaneously.

### 7.3 Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|---------------|-----|--------------|
| Downloaded PDFs | Vercel Blob | 90 days from last access | Manual or TTL |
| PDF screenshots | Vercel Blob | Same as parent PDF | Cascade with PDF |
| Parsed PDF structure | PdfCache.parsedSections | Persistent | On re-download |
| Evidence mappings | Database | Persistent | On document edit |
| Compliance results | Database | Persistent | On re-check |
| Paragraph analysis | Database | Persistent | On document version change |

### 7.4 Resource Limits

| Resource | MVP Limit | Rationale |
|----------|----------|-----------|
| Max PDF file size | 50 MB | Covers most papers; rejects scanned books |
| Max PDF pages | 100 | Prevents abuse with book-length PDFs |
| Max evidence mappings per document | 500 | Prevents runaway mapping jobs |
| Max screenshots per document | 1000 | Storage cost control |
| Max concurrent mapping jobs per user | 4 | Gemini API rate limiting |
| Max compliance checks per document | 3 | Guideline-specific (different guidelines) |

---

## 8. Technology Decisions

### 8.1 Decision Matrix

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| PDF parsing | pdfjs-dist (Node) | pdf-parse, pdfplumber (Python), Apache Tika | Same lib client/server, active maintenance, no Python dependency |
| Client PDF preview | pdfjs-dist (browser) | react-pdf, embed element | Full control over rendering, highlight overlays, consistent with server |
| PPTX generation | pptxgenjs | officegen, python-pptx | Pure JS, well-documented, no Python bridge needed |
| PDF report generation | @react-pdf/renderer | puppeteer, wkhtmltopdf, jsPDF | React-based, no headless browser needed, server-compatible |
| Screenshot rendering | canvas (npm) + pdfjs | puppeteer screenshot | No headless browser, faster, lower memory |
| Object storage | Vercel Blob | AWS S3, GCS, Cloudflare R2 | Zero-config with Vercel, sufficient for MVP |
| Queue system | Vercel Functions (no queue) | BullMQ, AWS SQS | Simplicity; background processing via async functions |
| LLM for mapping | Gemini 2.5 Flash | GPT-4o, Claude | Existing integration, cost-effective, structured output support |

### 8.2 PDF Parsing Architecture

```
Server-side (API routes):
  pdfjs-dist (Node.js build)
    -> getDocument() loads PDF binary
    -> page.getTextContent() extracts text items with positions
    -> Custom section detector identifies headings
    -> Output: ParsedPdf object

Client-side (Evidence tab):
  pdfjs-dist (browser build)
    -> Same PDF loaded via signed URL
    -> page.render() draws to canvas
    -> Custom overlay layer draws highlight rectangles
    -> User can zoom, pan, navigate pages
```

### 8.3 Gemini API Usage

Evidence mapping uses `generateObject()` from the Vercel AI SDK with Zod
schemas for structured output. This matches the existing pattern used in
`extract-evidence.ts` and `claim-compiler.ts`.

Model selection:
- `gemini-2.5-flash` for evidence mapping (fast, structured output)
- `gemini-2.5-flash` for paragraph flow analysis (consistent with existing)
- `gemini-2.5-flash` for compliance checking (checklist processing)

The same `translationModel` instance from `src/lib/gemini.ts` is reused.

### 8.4 Export Pipeline Architecture

```
Evidence Export Request
        |
        v
  Gather Data:
    - EvidenceMapping records (with Prisma includes)
    - HumanVerification records
    - CanonicalPaper metadata
    - Screenshot URLs (signed)
        |
        v
  Choose Format:
    |          |          |
   PPTX       PDF       DOCX
    |          |          |
    v          v          v
 pptxgenjs  @react-pdf  docx (existing)
    |          |          |
    v          v          v
  Binary     Binary     Binary
  Response   Response   Response
```

---

## 9. Implementation Plan

### 9.1 Phase 1: Foundation (Weeks 1-3)

**Goal: PDF pipeline and basic evidence mapping**

| Task | Priority | Estimated Effort |
|------|----------|-----------------|
| Add PdfCache, EvidenceMapping, HumanVerification models | P0 | 1 day |
| Prisma migration and relation updates | P0 | 0.5 day |
| PDF download service (cascading providers) | P0 | 2 days |
| PDF parsing service (pdfjs-dist server) | P0 | 2 days |
| Screenshot generation service | P0 | 1.5 days |
| Vercel Blob integration | P0 | 1 day |
| POST /api/evidence/map endpoint | P0 | 2 days |
| GET /api/evidence/mappings endpoint | P0 | 0.5 day |
| POST /api/evidence/verify-human endpoint | P0 | 0.5 day |

### 9.2 Phase 2: Evidence UI (Weeks 4-6)

**Goal: Evidence tab with split view and PDF preview**

| Task | Priority | Estimated Effort |
|------|----------|-----------------|
| Document workspace tab navigation | P0 | 1 day |
| Evidence tab split view layout | P0 | 2 days |
| Evidence mapping card component | P0 | 1.5 days |
| PDF viewer component (pdf.js browser) | P0 | 2 days |
| Sentence gutter status indicators | P1 | 1 day |
| Human verification checkbox UI | P1 | 0.5 day |
| Evidence documentation table view | P1 | 1.5 days |

### 9.3 Phase 3: Analysis and Compliance (Weeks 7-9)

**Goal: Paragraph flow and guideline compliance**

| Task | Priority | Estimated Effort |
|------|----------|-----------------|
| Add ParagraphAnalysis, ComplianceCheck models | P0 | 0.5 day |
| Paragraph flow analyzer service | P1 | 2 days |
| POST /api/analysis/paragraph-flow endpoint | P1 | 1 day |
| Paragraph flow UI (Review tab) | P1 | 2 days |
| Guideline JSON schema and data files | P1 | 2 days |
| Compliance checker service | P1 | 2 days |
| POST /api/analysis/compliance endpoint | P1 | 1 day |
| Compliance dashboard UI | P1 | 2 days |

### 9.4 Phase 4: Export (Weeks 10-11)

**Goal: Evidence documentation export**

| Task | Priority | Estimated Effort |
|------|----------|-----------------|
| PPTX export service (pptxgenjs) | P0 | 2 days |
| PDF export service (@react-pdf/renderer) | P1 | 2 days |
| DOCX evidence appendix (extend existing) | P2 | 1 day |
| Export tab UI with preview | P1 | 2 days |
| Batch screenshot pre-generation | P1 | 1 day |

### 9.5 Phase 5: Polish and Integration (Weeks 12-13)

**Goal: Integration with existing Citation Auto-Pilot and final polish**

| Task | Priority | Estimated Effort |
|------|----------|-----------------|
| Auto-Pilot integration (trigger mapping after accept) | P1 | 1 day |
| Coverage endpoint enhancement | P1 | 0.5 day |
| Verify endpoint enhancement (trigger PDF download) | P1 | 0.5 day |
| Performance optimization (batch mapping, caching) | P1 | 2 days |
| End-to-end testing | P0 | 3 days |
| Documentation | P2 | 1 day |

---

## 10. Error Handling and Edge Cases

### 10.1 PDF Not Available

When a cited paper's PDF cannot be downloaded:

```
Fallback chain:
  1. Try all providers in cascade (same as fulltext-resolver)
  2. If no PDF available:
     a. Mark EvidenceMapping.status = "NO_PDF"
     b. Fall back to text-only evidence (existing EvidenceSnippet)
     c. Show "PDF unavailable" badge in UI
     d. Evidence mapping still proceeds with text content
     e. Screenshot field is null; export shows text-only evidence
```

### 10.2 PDF Parsing Failures

```
Error types and handling:
  1. Scanned PDF (image-only, no text layer)
     -> Detect via empty getTextContent() result
     -> Mark as "SCAN_ONLY", suggest OCR in future
     -> Fall back to text-only evidence from other sources

  2. Encrypted/DRM PDF
     -> Detect via pdfjs-dist load error
     -> Mark as "ENCRYPTED"
     -> Fall back to text-only evidence

  3. Corrupted PDF
     -> Detect via invalid magic bytes or parse error
     -> Retry download once from alternate provider
     -> Mark as "CORRUPT" if retry fails

  4. Very large PDF (>50MB or >100 pages)
     -> Reject at download stage
     -> Mark as "TOO_LARGE"
     -> Fall back to text-only evidence
```

### 10.3 Passage Not Found in PDF

When the Gemini-extracted passage cannot be fuzzy-matched to PDF text:

```
1. Relax fuzzy matching threshold from 0.85 to 0.70
2. Try matching against adjacent pages (+-1 page)
3. If still not found:
   a. Store passage text without PDF coordinates
   b. Mark evidence as "TEXT_ONLY" (no screenshot available)
   c. Show passage text with "Page location unknown" badge
```

### 10.4 Conflicting Evidence

When the cited paper contradicts the manuscript claim:

```
1. Set overallSupportLabel = "CONTRADICTED"
2. Set confidence to 0.0
3. Create a ReviewFinding with severity = "BLOCKER"
4. Show prominent red warning in Evidence tab
5. Block human verification until the contradiction is resolved
```

### 10.5 Document Edit After Mapping

When the user edits the manuscript after evidence has been mapped:

```
1. Detect sentence changes via text diff
2. For modified sentences:
   a. Mark existing EvidenceMapping.status = "STALE"
   b. Show "Evidence outdated" badge
   c. Offer "Re-map evidence" action
3. For deleted sentences:
   a. Soft-delete associated EvidenceMapping (mark status = "ORPHANED")
   b. Keep in database for audit trail
4. For new sentences:
   a. No action (user must explicitly map)
```

---

## 11. Monitoring and Observability

### 11.1 Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Evidence mapping success rate | >95% | <90% |
| PDF download success rate | >85% | <75% |
| Screenshot generation success rate | >98% | <95% |
| Average mapping latency | <5s | >10s |
| Average PDF download latency | <8s | >15s |
| Gemini API error rate | <1% | >3% |
| Human verification rate | >50% mapped | <30% |

### 11.2 Logging

All evidence pipeline operations log to the existing `AgentRun` table:

```
AgentRun.agentType values:
  - "evidence_mapping"     (per-sentence mapping)
  - "pdf_download"         (PDF download)
  - "pdf_parse"            (PDF parsing)
  - "screenshot_gen"       (screenshot generation)
  - "paragraph_flow"       (flow analysis)
  - "compliance_check"     (guideline compliance)
  - "evidence_export"      (export generation)
```

---

## 12. Migration Strategy

### 12.1 Database Migration

The new models are additive only -- no existing tables are modified in structure.
New relations are added via optional foreign keys and new relation fields.

Migration steps:
1. Add new models (PdfCache, EvidenceMapping, HumanVerification, ComplianceCheck, ParagraphAnalysis)
2. Add new relation fields on existing models (Document, ManuscriptCitation, CanonicalPaper, User)
3. Run `prisma migrate dev` to generate and apply migration
4. No data migration needed (new tables start empty)

### 12.2 Backward Compatibility

- All existing API endpoints continue to work without changes.
- The Write tab is the default view (same as current behavior).
- Evidence, Review, and Export tabs are accessible only when the document has
  at least one ManuscriptCitation.
- Free plan users see the Write tab only; Evidence features require Pro or Max.

### 12.3 Feature Flags

New features are gated behind plan-based feature flags:

| Feature | FREE | PRO | MAX |
|---------|------|-----|-----|
| Write tab (existing) | Yes | Yes | Yes |
| Evidence mapping | No | Yes (50/month) | Yes (unlimited) |
| PDF download | No | Yes | Yes |
| Human verification | No | Yes | Yes |
| Paragraph flow | No | Yes | Yes |
| Compliance check | No | No | Yes |
| PPTX export | No | Yes (watermark) | Yes |
| PDF export | No | Yes (watermark) | Yes |

---

## 13. Testing Strategy

### 13.1 Unit Tests

| Component | Test Focus | Framework |
|-----------|-----------|-----------|
| PDF parser | Section detection, text extraction accuracy | Vitest |
| Fuzzy matcher | Text matching against PDF items, edge cases | Vitest |
| Screenshot region calculator | Bounding box computation, margins | Vitest |
| Cite key generator | Determinism, collision handling | Vitest (existing) |
| Compliance item matcher | Fulfillment classification | Vitest |
| Export builder | Slide structure, metadata correctness | Vitest |

### 13.2 Integration Tests

| Flow | Test Scope |
|------|-----------|
| PDF pipeline | Download -> Parse -> Screenshot (with real PDF) |
| Evidence mapping | Sentence -> Claims -> Passages -> Regions |
| Human verification | Map -> Verify -> Status update |
| Export | Mapping -> Screenshot -> PPTX/PDF generation |

### 13.3 Test Data

- Sample PDFs for testing: 3 open-access medical AI papers from PMC
- Sample manuscripts: 2 test documents with known citation patterns
- Expected evidence mappings: manually curated ground truth for validation

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| Evidence Mapping | A structured record proving that a manuscript sentence's claims are supported by specific passages in a cited paper |
| Atomic Claim | A single, indivisible factual assertion extracted from a manuscript sentence |
| Supporting Passage | A verbatim excerpt from a cited paper that supports an atomic claim |
| PDF Region | A rectangular area on a specific PDF page, defined by coordinates |
| Human Verification | A manual approval record where a researcher confirms evidence validity |
| Evidence Tier | Classification of evidence source quality: FULLTEXT or ABSTRACT_ONLY |
| Flow Analysis | Assessment of logical paragraph-to-paragraph transitions in a manuscript |
| Compliance Check | Validation of a manuscript against a reporting guideline checklist |
| Evidence Deck | An exported PPTX/PDF document containing all evidence mappings with screenshots |

---

## Appendix A: Full Component Hierarchy (v2 additions)

```
EditorPageClient (existing, extended)
  DocumentWorkflowHeader (new)
    TabNavigation: Write | Evidence | Review | Export
  SectionRail (existing, from citation_grounded_ui_ux)

  [Write Tab - existing with enhancements]
    GroundedWorkspace (existing)
      SourceEditorPane (existing)
      ManuscriptEditorPane (existing, enhanced)
        SentenceCoverageGutter (existing)
        ParagraphActionToolbar (existing)
      EvidenceDrawer (existing)

  [Evidence Tab - new]
    EvidenceTabLayout
      ManuscriptReadOnlyPane
        SentenceStatusGutter
        SentenceClickHandler
      EvidenceMappingPanel
        EvidenceMappingSummaryBar
        EvidenceMappingCard
          AtomicClaimList
          SupportingPassageCard
          PdfScreenshotViewer
          ConfidenceBadge
          HumanVerificationCheckbox
        EvidenceMappingActions
      EvidenceDocumentationTable
        CitationRow
        EvidenceStatusBadge
      PdfViewerModal
        PdfCanvas
        HighlightOverlay
        PageNavigation

  [Review Tab - new, extends existing review]
    ReviewTabLayout
      ReviewSubnav: Findings | Flow | Compliance
      [Findings sub-tab - existing]
        ReviewFindingsList (existing)
        ReviewFindingDetail (existing)
      [Flow sub-tab - new]
        ParagraphFlowDiagram
        TransitionAssessmentCard
        FlowIssueCard
        MissingLiteratureCard
      [Compliance sub-tab - new]
        GuidelineSelector
        ComplianceSummaryBar
        ComplianceItemList
        ComplianceItemCard
        ComplianceExportButton

  [Export Tab - new]
    ExportTabLayout
      ExportFormatSelector
      ExportOptionsPanel
        SectionFilter
        IncludeUnverifiedToggle
        IncludeComplianceToggle
      ExportPreview
      ExportActionBar
        DownloadPptxButton
        DownloadPdfButton
        DownloadDocxButton
        DownloadBibtexButton
```

---

## Appendix B: Database Schema Diff Summary

New models (5):
- `PdfCache` -- downloaded PDF files with parse cache
- `EvidenceMapping` -- manuscript-to-cited-paper evidence proof
- `HumanVerification` -- human approval records
- `ComplianceCheck` -- guideline compliance results
- `ParagraphAnalysis` -- flow analysis results

Modified models (4):
- `Document` -- add `evidenceMappings`, `complianceChecks`, `paragraphAnalyses` relations
- `ManuscriptCitation` -- add `evidenceMappings` relation
- `CanonicalPaper` -- add `pdfCache` relation
- `User` -- add `humanVerifications` relation

No models removed. No existing columns changed.

---

## Appendix C: External API Dependencies

| API | Purpose | Auth | Rate Limit | Fallback |
|-----|---------|------|-----------|----------|
| PMC OA Web Service | PDF/XML download | None | 3 req/s | Unpaywall |
| Unpaywall | OA URL resolution | Email-based | 100K/day | CORE |
| arXiv | PDF download | None | Reasonable use | S2ORC |
| CORE API | OA full text | API key | 10 req/s | Skip |
| S2ORC | Structured abstracts | API key | 100 req/5min | Abstract only |
| Gemini API | LLM processing | API key | Per-model limits | Retry with backoff |
| Vercel Blob | Object storage | Built-in | Per-plan limits | S3 fallback |

---

End of document.
