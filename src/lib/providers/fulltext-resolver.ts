import type { FullTextResult } from "./types";
import { unpaywallAdapter } from "./unpaywall";
import { pmcAdapter } from "./pmc";
import { s2orcAdapter } from "./s2orc";
import { arxivFullTextAdapter } from "./arxiv-fulltext";
import { coreAdapter } from "./core";

interface PaperIdentifiers {
  doi?: string;
  pmid?: string;
  pmcid?: string;
  arxivId?: string;
}

/**
 * Resolve full text for a paper using a cascading fallback strategy:
 *
 * 1. PMC (best: structured JATS XML with sections)
 * 2. S2ORC (structured abstract + TLDR)
 * 3. arXiv (for CS/physics/math papers)
 * 4. Unpaywall -> find OA URL -> try PMC if PMCID found
 * 5. CORE (OA full text fallback)
 *
 * Returns the first successful result with meaningful content.
 */
export async function resolveFullText(
  identifiers: PaperIdentifiers,
): Promise<FullTextResult | null> {
  // Strategy 1: If we have PMCID or PMID, try PMC first (best structured format)
  if (identifiers.pmcid || identifiers.pmid) {
    const pmcResult = await pmcAdapter.getFullText(identifiers);
    // Prefer PMC only if it has body sections, not just abstract
    if (pmcResult && pmcResult.sections.length > 1) return pmcResult;
  }

  // Strategy 2: Try S2ORC for abstract + TLDR
  const s2Result = await s2orcAdapter.getFullText(identifiers);

  // Strategy 3: If arXiv paper, get abstract
  if (identifiers.arxivId) {
    const arxivResult = await arxivFullTextAdapter.getFullText(identifiers);
    // Prefer S2ORC if it has TLDR + abstract, but use arXiv abstract if S2 fails
    if (arxivResult && !s2Result) return arxivResult;
  }

  // Strategy 4: Use Unpaywall to find PMCID or OA URL
  if (identifiers.doi) {
    const oaInfo = await unpaywallAdapter.findOaUrl(identifiers.doi);
    if (oaInfo?.pmcid) {
      // Found PMCID via Unpaywall, try PMC
      const pmcResult = await pmcAdapter.getFullText({
        ...identifiers,
        pmcid: oaInfo.pmcid,
      });
      if (pmcResult && pmcResult.sections.length > 1) return pmcResult;
    }
  }

  // Strategy 5: Try CORE as OA fallback
  if (identifiers.doi) {
    const coreResult = await coreAdapter.getFullText(identifiers);
    if (coreResult) return coreResult;
  }

  // Return S2ORC result if we got one (abstract + TLDR)
  if (s2Result) return s2Result;

  // No full text available
  return null;
}

/**
 * Determine evidence tier based on what sections are available.
 * FULLTEXT means we have body sections (Introduction, Methods, etc.).
 * ABSTRACT_ONLY means we only have abstract or unstructured content.
 */
export function getEvidenceTier(
  result: FullTextResult,
): "FULLTEXT" | "ABSTRACT_ONLY" {
  const hasBodySection = result.sections.some(
    (s) =>
      s.sectionType !== undefined &&
      !["ABSTRACT", "OTHER"].includes(s.sectionType),
  );
  return hasBodySection ? "FULLTEXT" : "ABSTRACT_ONLY";
}
