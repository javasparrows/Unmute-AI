/**
 * Resolve a downloadable PDF URL for a paper.
 * Uses Unpaywall API (free, no key for small volume) and PMC.
 */
export async function resolvePdfUrl(
  doi: string | null,
  pmid: string | null,
): Promise<string | null> {
  // 1. Try Unpaywall
  if (doi) {
    try {
      const res = await fetch(
        `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=support@unmute-ai.com`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = await res.json();
        const bestOa = data.best_oa_location;
        if (bestOa?.url_for_pdf) return bestOa.url_for_pdf as string;
        if (bestOa?.url) return bestOa.url as string;
      }
    } catch {
      // Continue to next method
    }
  }

  // 2. Try PMC
  if (pmid) {
    try {
      const res = await fetch(
        `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${pmid}&format=json`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = await res.json();
        const pmcid = data.records?.[0]?.pmcid;
        if (pmcid) {
          return `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/pdf/`;
        }
      }
    } catch {
      // Continue
    }
  }

  // 3. Try DOI redirect (some publishers provide direct PDF)
  if (doi) {
    return `https://doi.org/${doi}`;
  }

  return null;
}
