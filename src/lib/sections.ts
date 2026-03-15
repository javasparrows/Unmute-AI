export const SECTION_TYPES = [
  "ABSTRACT",
  "INTRODUCTION",
  "METHODS",
  "RESULTS",
  "DISCUSSION",
  "REFERENCES",
  "OTHER",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export interface SectionItem {
  id: string;
  type: SectionType;
  startParagraph: number;
  endParagraph: number; // exclusive
  heading?: string;
  origin: "manual" | "auto" | "legacy";
}

export interface DocumentSectionMeta {
  schemaVersion: 1;
  items: SectionItem[];
}

/**
 * Normalize sections from DB value. If null/undefined, return a single OTHER section.
 */
export function normalizeSections(
  raw: unknown,
  text: string,
): DocumentSectionMeta {
  if (raw && typeof raw === "object" && "schemaVersion" in raw) {
    return raw as DocumentSectionMeta;
  }

  const paragraphCount = text ? text.split("\n\n").length : 1;
  return {
    schemaVersion: 1,
    items: [
      {
        id: "legacy-0",
        type: "OTHER",
        startParagraph: 0,
        endParagraph: paragraphCount,
        origin: "legacy",
      },
    ],
  };
}

/**
 * Auto-detect sections from text by scanning for heading patterns.
 * Returns a suggested section map (not persisted until user confirms).
 */
export function detectSections(text: string): DocumentSectionMeta {
  const paragraphs = text.split("\n\n");
  const items: SectionItem[] = [];
  let currentStart = 0;
  let currentType: SectionType = "OTHER";
  let currentHeading: string | undefined;
  let idCounter = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    const detected = detectSectionType(p);

    if (detected && i > currentStart) {
      // Close previous section
      items.push({
        id: `auto-${idCounter++}`,
        type: currentType,
        startParagraph: currentStart,
        endParagraph: i,
        heading: currentHeading,
        origin: "auto",
      });
      currentStart = i;
      currentType = detected;
      currentHeading = p;
    } else if (detected && i === currentStart) {
      currentType = detected;
      currentHeading = p;
    }
  }

  // Close last section
  items.push({
    id: `auto-${idCounter++}`,
    type: currentType,
    startParagraph: currentStart,
    endParagraph: paragraphs.length,
    heading: currentHeading,
    origin: "auto",
  });

  return { schemaVersion: 1, items };
}

const SECTION_PATTERNS: [RegExp, SectionType][] = [
  [/^#+\s*abstract/i, "ABSTRACT"],
  [/^abstract$/i, "ABSTRACT"],
  [/^#+\s*introduction/i, "INTRODUCTION"],
  [/^introduction$/i, "INTRODUCTION"],
  [/^#+\s*(materials?\s+(and|&)\s+)?methods?/i, "METHODS"],
  [/^(materials?\s+(and|&)\s+)?methods?$/i, "METHODS"],
  [/^#+\s*results?/i, "RESULTS"],
  [/^results?$/i, "RESULTS"],
  [/^#+\s*discussion/i, "DISCUSSION"],
  [/^discussion$/i, "DISCUSSION"],
  [/^#+\s*results?\s+(and|&)\s+discussion/i, "DISCUSSION"],
  [/^#+\s*references?/i, "REFERENCES"],
  [/^references?$/i, "REFERENCES"],
  [/^#+\s*bibliography/i, "REFERENCES"],
];

function detectSectionType(paragraph: string): SectionType | null {
  const line = paragraph.split("\n")[0].trim();
  for (const [pattern, type] of SECTION_PATTERNS) {
    if (pattern.test(line)) return type;
  }
  return null;
}

/**
 * Find which section a given paragraph index belongs to.
 */
export function getSectionForParagraph(
  sections: DocumentSectionMeta,
  paragraphIndex: number,
): SectionItem | undefined {
  return sections.items.find(
    (s) => paragraphIndex >= s.startParagraph && paragraphIndex < s.endParagraph,
  );
}

/**
 * Find which section a given sentence index belongs to.
 * Sentences are mapped to paragraphs by counting paragraph breaks.
 */
export function getSectionForSentence(
  sections: DocumentSectionMeta,
  text: string,
  sentenceIndex: number,
): SectionItem | undefined {
  const paragraphs = text.split("\n\n");
  let sentenceCount = 0;

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const sentences = paragraphs[pIdx].split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentenceIndex < sentenceCount + sentences.length) {
      return getSectionForParagraph(sections, pIdx);
    }
    sentenceCount += sentences.length;
  }

  return sections.items[sections.items.length - 1];
}

/**
 * Get display label for a section type.
 */
export function getSectionLabel(type: SectionType): string {
  const labels: Record<SectionType, string> = {
    ABSTRACT: "Abstract",
    INTRODUCTION: "Introduction",
    METHODS: "Methods",
    RESULTS: "Results",
    DISCUSSION: "Discussion",
    REFERENCES: "References",
    OTHER: "Other",
  };
  return labels[type];
}
