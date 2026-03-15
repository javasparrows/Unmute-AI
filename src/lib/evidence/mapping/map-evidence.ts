import { prisma } from "@/lib/prisma";
import { retrieveCitedPaperText } from "./pdf-retriever";
import { matchPassage } from "./passage-matcher";

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

  // 4. Store the mapping (upsert for idempotency)
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
    humanVerified: mapping.humanVerified,
    verificationStatus: mapping.verificationStatus,
  };
}
