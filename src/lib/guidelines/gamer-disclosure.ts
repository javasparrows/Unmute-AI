/**
 * Generate a GAMER-compliant AI disclosure statement.
 */
export function generateGamerDisclosure(params: {
  aiTools: {
    name: string;
    version?: string;
    provider: string;
    tasks: string[];
  }[];
  factCheckMethod: string;
  dataPrivacyNote?: string;
}): string {
  const { aiTools, factCheckMethod, dataPrivacyNote } = params;

  const toolDescriptions = aiTools
    .map((tool) => {
      const version = tool.version ? ` (version ${tool.version})` : "";
      const tasks = tool.tasks.join(", ");
      return `${tool.name}${version} (${tool.provider}) was used for ${tasks}`;
    })
    .join(". ");

  const lines = [
    "Declaration of Generative AI Use",
    "",
    `The following generative AI tools were used during the preparation of this manuscript: ${toolDescriptions}.`,
    "",
    `All AI-generated content was reviewed and verified by the authors. ${factCheckMethod}`,
    "",
    "The authors take full responsibility for the content of this publication.",
  ];

  if (dataPrivacyNote) {
    lines.push("", dataPrivacyNote);
  }

  return lines.join("\n");
}

/**
 * Generate default disclosure for Unmute AI usage.
 */
export function generateUnmuteDisclosure(): string {
  return generateGamerDisclosure({
    aiTools: [
      {
        name: "Unmute AI",
        provider: "Unmute AI Inc.",
        tasks: [
          "manuscript translation between Japanese and English",
          "citation search and verification via academic databases (OpenAlex, Crossref, PubMed)",
          "evidence mapping between manuscript claims and cited paper passages",
        ],
      },
      {
        name: "Gemini 2.5 Flash",
        version: "2025",
        provider: "Google",
        tasks: [
          "natural language processing for translation and text analysis",
        ],
      },
    ],
    factCheckMethod:
      "All citations were verified against DOI/PMID records. Evidence mappings between manuscript claims and cited paper passages were reviewed and approved by the authors using the human verification workflow in Unmute AI.",
  });
}
