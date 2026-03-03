import type { AlignmentGroup, AlignedTranslationItem } from "@/types";

/**
 * Build N:M alignment groups from Gemini's {text, src}[] response.
 */
export function buildAlignmentFromResponse(
  items: AlignedTranslationItem[],
): AlignmentGroup[] {
  const groups: AlignmentGroup[] = [];
  const srcToGroup = new Map<string, number>();

  for (let rightIdx = 0; rightIdx < items.length; rightIdx++) {
    const srcKey = items[rightIdx].src.sort((a, b) => a - b).join(",");
    const existingIdx = srcToGroup.get(srcKey);

    if (existingIdx !== undefined) {
      // Same src group — add this right index
      groups[existingIdx].right.push(rightIdx);
    } else {
      // New group
      const groupIdx = groups.length;
      groups.push({
        left: [...items[rightIdx].src].sort((a, b) => a - b),
        right: [rightIdx],
      });
      srcToGroup.set(srcKey, groupIdx);
    }
  }

  return groups;
}

/**
 * Build identity (1:1) alignment for backward compatibility.
 */
export function buildIdentityAlignment(count: number): AlignmentGroup[] {
  return Array.from({ length: count }, (_, i) => ({
    left: [i],
    right: [i],
  }));
}

/**
 * Find the group index that contains the given sentence index on the specified side.
 */
export function findGroupIndex(
  alignment: AlignmentGroup[],
  sentenceIndex: number,
  side: "left" | "right",
): number {
  return alignment.findIndex((g) => g[side].includes(sentenceIndex));
}

/**
 * Given a sentence index on one side, return the indices on both sides
 * from the matching alignment group.
 */
export function getGroupIndices(
  alignment: AlignmentGroup[],
  sentenceIndex: number,
  side: "left" | "right",
): { left: number[]; right: number[] } | null {
  const groupIdx = findGroupIndex(alignment, sentenceIndex, side);
  if (groupIdx === -1) return null;
  return alignment[groupIdx];
}
