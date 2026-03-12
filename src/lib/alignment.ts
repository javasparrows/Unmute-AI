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

/**
 * Find alignment group indices that contain any of the given source sentence indices.
 */
export function findAffectedGroups(
  alignment: AlignmentGroup[],
  changedSourceIndices: number[],
): number[] {
  const changedSet = new Set(changedSourceIndices);
  const affected: number[] = [];
  for (let g = 0; g < alignment.length; g++) {
    if (alignment[g].left.some((idx) => changedSet.has(idx))) {
      affected.push(g);
    }
  }
  return affected;
}

/**
 * Expand group indices to include ±1 neighbors for translation context.
 */
export function expandWithNeighbors(
  groupIndices: number[],
  totalGroups: number,
): number[] {
  const expanded = new Set<number>();
  for (const idx of groupIndices) {
    if (idx > 0) expanded.add(idx - 1);
    expanded.add(idx);
    if (idx < totalGroups - 1) expanded.add(idx + 1);
  }
  return [...expanded].sort((a, b) => a - b);
}

/**
 * Get all source sentence indices covered by the given alignment groups.
 */
export function getSourceIndicesFromGroups(
  alignment: AlignmentGroup[],
  groupIndices: number[],
): number[] {
  const indices = new Set<number>();
  for (const gIdx of groupIndices) {
    for (const sIdx of alignment[gIdx].left) {
      indices.add(sIdx);
    }
  }
  return [...indices].sort((a, b) => a - b);
}

/**
 * Merge partial translation results back into the existing target.
 * Only affected groups get new translations; all other groups keep existing ones.
 */
export function mergePartialTranslation(params: {
  previousAlignment: AlignmentGroup[];
  previousTargetNonSep: string[];
  affectedGroupIndices: number[];
  apiTranslations: string[];
  apiAlignment: AlignmentGroup[];
  localToGlobalSourceMap: number[];
}): {
  targetNonSep: string[];
  alignment: AlignmentGroup[];
} {
  const {
    previousAlignment,
    previousTargetNonSep,
    affectedGroupIndices,
    apiTranslations,
    apiAlignment,
    localToGlobalSourceMap,
  } = params;

  // Remap API alignment from local to global source indices
  const globalApiAlignment = apiAlignment.map((g) => ({
    left: g.left.map((i) =>
      i < localToGlobalSourceMap.length ? localToGlobalSourceMap[i] : i,
    ),
    right: g.right,
  }));

  // Map: global source index → API alignment group
  const sourceToApiGroup = new Map<number, AlignmentGroup>();
  for (const g of globalApiAlignment) {
    for (const srcIdx of g.left) {
      sourceToApiGroup.set(srcIdx, g);
    }
  }

  const affectedSet = new Set(affectedGroupIndices);
  const targetNonSep: string[] = [];
  const newAlignment: AlignmentGroup[] = [];
  const usedApiRightIndices = new Set<number>();

  for (let gIdx = 0; gIdx < previousAlignment.length; gIdx++) {
    const group = previousAlignment[gIdx];

    if (affectedSet.has(gIdx)) {
      // Affected group: use new API translations
      const newRightIndices: number[] = [];

      // Find all API groups covering any of this group's source indices
      const relevantApiGroups: AlignmentGroup[] = [];
      const seen = new Set<AlignmentGroup>();
      for (const srcIdx of group.left) {
        const apiGroup = sourceToApiGroup.get(srcIdx);
        if (apiGroup && !seen.has(apiGroup)) {
          seen.add(apiGroup);
          relevantApiGroups.push(apiGroup);
        }
      }

      // Collect source indices and translations from relevant API groups
      const newLeftIndices = new Set<number>();
      for (const apiGroup of relevantApiGroups) {
        for (const srcIdx of apiGroup.left) newLeftIndices.add(srcIdx);

        for (const rightIdx of apiGroup.right) {
          if (
            !usedApiRightIndices.has(rightIdx) &&
            rightIdx < apiTranslations.length
          ) {
            usedApiRightIndices.add(rightIdx);
            newRightIndices.push(targetNonSep.length);
            targetNonSep.push(apiTranslations[rightIdx]);
          }
        }
      }

      newAlignment.push({
        left: [...newLeftIndices].sort((a, b) => a - b),
        right: newRightIndices,
      });
    } else {
      // Non-affected group: keep existing translations
      const newRightIndices: number[] = [];
      for (const rightIdx of group.right) {
        if (rightIdx < previousTargetNonSep.length) {
          newRightIndices.push(targetNonSep.length);
          targetNonSep.push(previousTargetNonSep[rightIdx]);
        }
      }
      newAlignment.push({
        left: [...group.left],
        right: newRightIndices,
      });
    }
  }

  return { targetNonSep, alignment: newAlignment };
}
