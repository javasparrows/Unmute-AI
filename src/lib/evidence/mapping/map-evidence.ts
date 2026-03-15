import { prisma } from "@/lib/prisma";
import { retrieveCitedPaperText } from "./pdf-retriever";
import { matchPassage } from "./passage-matcher";
import { resolvePdfUrl } from "./pdf-url-resolver";

interface MapEvidenceInput {
  documentId: string;
  manuscriptCitationId: string;
  sentenceIndex: number;
  manuscriptSentence: string;
  sectionType?: string;
}

interface MapEvidenceResult {
  id: string;
  supportingPassage: string;
  citedPaperSection: string | null;
  citedPaperPage: number | null;
  confidence: number;
  mappingRationale: string | null;
  screenshotUrl: string | null;
  pdfUrl: string | null;
  humanVerified: boolean;
  verificationStatus: string;
}

/**
 * Map a manuscript sentence to a supporting passage in a cited paper.
 * This is the main orchestrator for the evidence mapping pipeline.
 */
export async function mapEvidence(
  input: MapEvidenceInput,
): Promise<MapEvidenceResult> {
  const {
    documentId,
    manuscriptCitationId,
    sentenceIndex,
    manuscriptSentence,
    sectionType,
  } = input;

  // 1. Get the cited paper info
  const citation = await prisma.manuscriptCitation.findUnique({
    where: { id: manuscriptCitationId },
    include: {
      paper: {
        select: { id: true, title: true },
      },
    },
  });

  if (!citation) {
    throw new Error("Citation not found");
  }

  // 2. Retrieve cited paper text
  const paperText = await retrieveCitedPaperText(citation.paperId);

  if (!paperText) {
    // No text available -- create a mapping with low confidence
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
        sectionType,
        supportingPassage: "Full text not available for this paper",
        confidence: 0,
        mappingRationale: "Unable to retrieve full text of the cited paper",
        verificationStatus: "pending",
      },
      update: {
        manuscriptSentence,
        sectionType,
        supportingPassage: "Full text not available for this paper",
        confidence: 0,
        mappingRationale: "Unable to retrieve full text of the cited paper",
      },
    });

    return {
      id: mapping.id,
      supportingPassage: mapping.supportingPassage,
      citedPaperSection: null,
      citedPaperPage: null,
      confidence: 0,
      mappingRationale: mapping.mappingRationale,
      screenshotUrl: null,
      pdfUrl: null,
      humanVerified: false,
      verificationStatus: "pending",
    };
  }

  // 3. Match passage using Gemini
  const match = await matchPassage(
    manuscriptSentence,
    paperText.pages,
    citation.paper.title,
  );

  // 4. Resolve PDF URL for the cited paper
  let pdfUrl: string | null = null;
  const paperIds = await prisma.canonicalPaper.findUnique({
    where: { id: citation.paperId },
    include: { identifiers: true },
  });

  if (paperIds) {
    const doi =
      paperIds.identifiers.find((i) => i.provider === "crossref")
        ?.externalId ?? null;
    const pmid =
      paperIds.identifiers.find((i) => i.provider === "pubmed")
        ?.externalId ?? null;
    pdfUrl = await resolvePdfUrl(doi, pmid);
  }

  // 5. Store the mapping (upsert for idempotency)
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
      sectionType,
      supportingPassage: match.supportingPassage,
      citedPaperSection: match.citedPaperSection,
      citedPaperPage: match.citedPaperPage,
      confidence: match.confidence,
      mappingRationale: match.rationale,
      screenshotUrl: pdfUrl,
      verificationStatus: "pending",
    },
    update: {
      manuscriptSentence,
      sectionType,
      supportingPassage: match.supportingPassage,
      citedPaperSection: match.citedPaperSection,
      citedPaperPage: match.citedPaperPage,
      confidence: match.confidence,
      mappingRationale: match.rationale,
      screenshotUrl: pdfUrl,
    },
  });

  return {
    id: mapping.id,
    supportingPassage: mapping.supportingPassage,
    citedPaperSection: mapping.citedPaperSection,
    citedPaperPage: mapping.citedPaperPage,
    confidence: mapping.confidence,
    mappingRationale: mapping.mappingRationale,
    screenshotUrl: mapping.screenshotUrl,
    pdfUrl: mapping.screenshotUrl,
    humanVerified: mapping.humanVerified,
    verificationStatus: mapping.verificationStatus,
  };
}
