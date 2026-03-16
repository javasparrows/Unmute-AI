"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";

export const HIGHLIGHT_COLORS = [
  { id: "amber", label: "Amber", color: "oklch(0.58 0.12 55)" },
  { id: "yellow", label: "Yellow", color: "oklch(0.75 0.15 85)" },
  { id: "green", label: "Green", color: "oklch(0.55 0.14 150)" },
  { id: "teal", label: "Teal", color: "oklch(0.55 0.12 190)" },
  { id: "blue", label: "Blue", color: "oklch(0.55 0.15 250)" },
  { id: "indigo", label: "Indigo", color: "oklch(0.50 0.15 275)" },
  { id: "purple", label: "Purple", color: "oklch(0.55 0.15 300)" },
  { id: "pink", label: "Pink", color: "oklch(0.60 0.16 350)" },
  { id: "red", label: "Red", color: "oklch(0.55 0.18 25)" },
  { id: "orange", label: "Orange", color: "oklch(0.60 0.16 45)" },
] as const;

export type HighlightColorId = (typeof HIGHLIGHT_COLORS)[number]["id"];

const CITATION_STORAGE_KEY = "unmute:citation-color";
const SENTENCE_STORAGE_KEY = "unmute:sentence-color";
const DEFAULT_CITATION_COLOR: HighlightColorId = "blue";
const DEFAULT_SENTENCE_COLOR: HighlightColorId = "amber";

function isValidColorId(value: unknown): value is HighlightColorId {
  return (
    typeof value === "string" &&
    HIGHLIGHT_COLORS.some((c) => c.id === value)
  );
}

export function useHighlightColors() {
  const [rawCitationId, setRawCitationId] = useLocalStorage<string>(
    CITATION_STORAGE_KEY,
    DEFAULT_CITATION_COLOR,
  );

  const [rawSentenceId, setRawSentenceId] = useLocalStorage<string>(
    SENTENCE_STORAGE_KEY,
    DEFAULT_SENTENCE_COLOR,
  );

  const citationColorId: HighlightColorId = isValidColorId(rawCitationId)
    ? rawCitationId
    : DEFAULT_CITATION_COLOR;

  const sentenceColorId: HighlightColorId = isValidColorId(rawSentenceId)
    ? rawSentenceId
    : DEFAULT_SENTENCE_COLOR;

  const citationColor =
    HIGHLIGHT_COLORS.find((c) => c.id === citationColorId) ?? HIGHLIGHT_COLORS[4]; // blue

  const sentenceColor =
    HIGHLIGHT_COLORS.find((c) => c.id === sentenceColorId) ?? HIGHLIGHT_COLORS[0]; // amber

  const setCitationColor = (id: HighlightColorId) => {
    setRawCitationId(id);
  };

  const setSentenceColor = (id: HighlightColorId) => {
    setRawSentenceId(id);
  };

  return {
    citationColorId,
    setCitationColor,
    citationColor,
    sentenceColorId,
    setSentenceColor,
    sentenceColor,
    colors: HIGHLIGHT_COLORS,
  };
}
