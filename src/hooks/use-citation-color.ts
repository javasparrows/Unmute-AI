"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";

export const CITATION_COLORS = [
  { id: "amber", label: "Amber", color: "oklch(0.58 0.12 55)" },
  { id: "blue", label: "Blue", color: "oklch(0.55 0.15 250)" },
  { id: "green", label: "Green", color: "oklch(0.55 0.14 150)" },
  { id: "purple", label: "Purple", color: "oklch(0.55 0.15 300)" },
  { id: "red", label: "Red", color: "oklch(0.55 0.18 25)" },
  { id: "teal", label: "Teal", color: "oklch(0.55 0.12 190)" },
  { id: "pink", label: "Pink", color: "oklch(0.60 0.16 350)" },
] as const;

export type CitationColorId = (typeof CITATION_COLORS)[number]["id"];

const STORAGE_KEY = "unmute:citation-color";
const DEFAULT_COLOR: CitationColorId = "amber";

function isValidColorId(value: unknown): value is CitationColorId {
  return (
    typeof value === "string" &&
    CITATION_COLORS.some((c) => c.id === value)
  );
}

export function useCitationColor() {
  const [rawColorId, setRawColorId] = useLocalStorage<string>(
    STORAGE_KEY,
    DEFAULT_COLOR,
  );

  const colorId: CitationColorId = isValidColorId(rawColorId)
    ? rawColorId
    : DEFAULT_COLOR;

  const currentColor =
    CITATION_COLORS.find((c) => c.id === colorId) ?? CITATION_COLORS[0];

  const setColor = (id: CitationColorId) => {
    setRawColorId(id);
  };

  return { colorId, setColor, currentColor, colors: CITATION_COLORS };
}
