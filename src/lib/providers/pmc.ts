import type { FullTextProvider, FullTextResult, PaperSection } from "./types";

const EUROPE_PMC_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest";
const NCBI_IDCONV_BASE = "https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0";

/**
 * PMC adapter: retrieves structured full text from Europe PMC in JATS XML format.
 * Provides the highest quality structured sections for biomedical papers.
 */
export const pmcAdapter: FullTextProvider = {
  name: "pmc",

  async getFullText(identifier): Promise<FullTextResult | null> {
    let pmcid = identifier.pmcid;

    if (!pmcid) {
      // Try to convert PMID to PMCID via NCBI ID converter
      if (identifier.pmid) {
        const resolved = await pmidToPmcid(identifier.pmid);
        if (!resolved) return null;
        pmcid = resolved;
      } else {
        return null;
      }
    }

    try {
      const res = await fetch(
        `${EUROPE_PMC_BASE}/${pmcid}/fullTextXML`,
      );
      if (!res.ok) return null;
      const xml = await res.text();

      const sections = parseJatsXml(xml);
      if (sections.length === 0) return null;

      return {
        paperId: pmcid,
        source: "pmc",
        sections,
        format: "structured",
      };
    } catch {
      return null;
    }
  },
};

/**
 * Parse JATS XML into structured sections.
 * JATS <sec> elements have sec-type attributes or <title> children.
 */
function parseJatsXml(xml: string): PaperSection[] {
  const sections: PaperSection[] = [];

  // Extract abstract
  const abstractMatch = xml.match(/<abstract[^>]*>([\s\S]*?)<\/abstract>/i);
  if (abstractMatch) {
    const text = stripXmlTags(abstractMatch[1]).trim();
    if (text) {
      sections.push({ heading: "Abstract", sectionType: "ABSTRACT", text });
    }
  }

  // Extract body sections
  const bodyMatch = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyXml = bodyMatch[1];
    // Get top-level <sec> elements (not nested)
    const secRegex = /<sec[^>]*>([\s\S]*?)(?=<sec[^>]*>|<\/body>)/gi;
    let match;
    while ((match = secRegex.exec(bodyXml)) !== null) {
      const secContent = match[0];

      // Extract title
      const titleMatch = secContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const heading = titleMatch
        ? stripXmlTags(titleMatch[1]).trim()
        : "Untitled Section";

      // Determine section type from sec-type attribute or heading
      const secTypeAttr = secContent.match(/sec-type="([^"]+)"/i);
      const sectionType = classifySection(secTypeAttr?.[1] ?? heading);

      // Extract text (strip all XML tags, remove title from content)
      const text = stripXmlTags(
        secContent.replace(/<title[^>]*>[\s\S]*?<\/title>/i, ""),
      ).trim();

      const MIN_SECTION_LENGTH = 50;
      if (text.length > MIN_SECTION_LENGTH) {
        sections.push({ heading, sectionType, text });
      }
    }
  }

  return sections;
}

function classifySection(
  input: string,
): PaperSection["sectionType"] {
  const lower = input.toLowerCase();
  if (lower.includes("intro") || lower.includes("background"))
    return "INTRODUCTION";
  if (
    lower.includes("method") ||
    lower.includes("material") ||
    lower.includes("procedure")
  )
    return "METHODS";
  if (lower.includes("result") || lower.includes("finding")) return "RESULTS";
  if (lower.includes("discuss") || lower.includes("interpret"))
    return "DISCUSSION";
  if (lower.includes("conclu") || lower.includes("summary"))
    return "CONCLUSION";
  return "OTHER";
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function pmidToPmcid(pmid: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${NCBI_IDCONV_BASE}/?ids=${pmid}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      records?: { pmcid?: string }[];
    };
    return data.records?.[0]?.pmcid ?? null;
  } catch {
    return null;
  }
}
