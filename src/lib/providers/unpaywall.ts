const BASE_URL = "https://api.unpaywall.org/v2";
const EMAIL = "support@unmute-ai.com";

interface OaLocation {
  url_for_pdf?: string;
  url_for_landing_page?: string;
  pmh_id?: string;
  url?: string;
}

interface UnpaywallResponse {
  best_oa_location?: OaLocation;
  oa_locations?: OaLocation[];
}

interface OaUrlResult {
  pdfUrl?: string;
  landingUrl?: string;
  pmcid?: string;
}

/**
 * Unpaywall adapter: finds Open Access URLs for a DOI.
 * No API key required -- uses email-based access.
 */
export const unpaywallAdapter = {
  name: "unpaywall",

  async findOaUrl(doi: string): Promise<OaUrlResult | null> {
    try {
      const res = await fetch(
        `${BASE_URL}/${encodeURIComponent(doi)}?email=${EMAIL}`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as UnpaywallResponse;

      const best = data.best_oa_location;
      if (!best) return null;

      // Check if any location has a PMC ID
      let pmcid: string | undefined;
      for (const loc of data.oa_locations ?? []) {
        if (loc.pmh_id?.startsWith("oai:pubmedcentral.nih.gov:")) {
          pmcid = "PMC" + loc.pmh_id.split(":").pop();
          break;
        }
        if (loc.url?.includes("ncbi.nlm.nih.gov/pmc/")) {
          const match = loc.url.match(/PMC\d+/);
          if (match) {
            pmcid = match[0];
            break;
          }
        }
      }

      return {
        pdfUrl: best.url_for_pdf ?? undefined,
        landingUrl: best.url_for_landing_page ?? undefined,
        pmcid,
      };
    } catch {
      return null;
    }
  },
};
