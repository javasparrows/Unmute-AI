import { describe, it, expect } from "vitest";
import {
  findAffectedGroups,
  expandWithNeighbors,
  getSourceIndicesFromGroups,
  mergePartialTranslation,
} from "../alignment";
import type { AlignmentGroup } from "@/types";

describe("findAffectedGroups", () => {
  const alignment: AlignmentGroup[] = [
    { left: [0, 1], right: [0] },
    { left: [2], right: [1, 2] },
    { left: [3], right: [3] },
    { left: [4], right: [4] },
  ];

  it("finds groups containing changed source indices", () => {
    expect(findAffectedGroups(alignment, [2])).toEqual([1]);
  });

  it("finds multiple affected groups", () => {
    expect(findAffectedGroups(alignment, [0, 3])).toEqual([0, 2]);
  });

  it("finds group for merged source sentences", () => {
    expect(findAffectedGroups(alignment, [1])).toEqual([0]);
  });

  it("returns empty for no changes", () => {
    expect(findAffectedGroups(alignment, [])).toEqual([]);
  });

  it("returns empty for out-of-range indices", () => {
    expect(findAffectedGroups(alignment, [99])).toEqual([]);
  });
});

describe("expandWithNeighbors", () => {
  it("expands with ±1 neighbors", () => {
    expect(expandWithNeighbors([1], 4)).toEqual([0, 1, 2]);
  });

  it("clamps to bounds", () => {
    expect(expandWithNeighbors([0], 4)).toEqual([0, 1]);
    expect(expandWithNeighbors([3], 4)).toEqual([2, 3]);
  });

  it("merges overlapping ranges", () => {
    expect(expandWithNeighbors([1, 2], 5)).toEqual([0, 1, 2, 3]);
  });

  it("handles single group total", () => {
    expect(expandWithNeighbors([0], 1)).toEqual([0]);
  });
});

describe("getSourceIndicesFromGroups", () => {
  const alignment: AlignmentGroup[] = [
    { left: [0, 1], right: [0] },
    { left: [2], right: [1, 2] },
    { left: [3], right: [3] },
  ];

  it("collects all source indices from specified groups", () => {
    expect(getSourceIndicesFromGroups(alignment, [0, 1])).toEqual([0, 1, 2]);
  });

  it("handles single group", () => {
    expect(getSourceIndicesFromGroups(alignment, [2])).toEqual([3]);
  });
});

describe("mergePartialTranslation", () => {
  it("replaces only affected groups and keeps others intact", () => {
    const previousAlignment: AlignmentGroup[] = [
      { left: [0, 1], right: [0] },
      { left: [2], right: [1, 2] },
      { left: [3], right: [3] },
      { left: [4], right: [4] },
    ];
    const previousTargetNonSep = [
      "AB_old",
      "C_old_1",
      "C_old_2",
      "D_old",
      "E_old",
    ];

    // Only group 1 is affected (source sentence 2 changed)
    // API received sentences from groups 0,1,2 (expanded)
    // API returned new translations for those
    const result = mergePartialTranslation({
      previousAlignment,
      previousTargetNonSep,
      affectedGroupIndices: [1],
      apiTranslations: ["AB_new", "C_new", "D_new"],
      apiAlignment: [
        { left: [0, 1], right: [0] }, // local indices
        { left: [2], right: [1] },
        { left: [3], right: [2] },
      ],
      // local 0→global 0, local 1→global 1, local 2→global 2, local 3→global 3
      localToGlobalSourceMap: [0, 1, 2, 3],
    });

    // Group 0 (not affected): keeps "AB_old"
    // Group 1 (affected): gets "C_new" (API's translation for source 2)
    // Group 2 (not affected): keeps "D_old"
    // Group 3 (not affected): keeps "E_old"
    expect(result.targetNonSep).toEqual(["AB_old", "C_new", "D_old", "E_old"]);

    // Alignment right indices are recalculated
    expect(result.alignment).toEqual([
      { left: [0, 1], right: [0] },
      { left: [2], right: [1] },
      { left: [3], right: [2] },
      { left: [4], right: [3] },
    ]);
  });

  it("handles N:M split in affected group", () => {
    const previousAlignment: AlignmentGroup[] = [
      { left: [0], right: [0] },
      { left: [1], right: [1] },
      { left: [2], right: [2] },
    ];
    const previousTargetNonSep = ["A_old", "B_old", "C_old"];

    // Group 1 affected, API splits sentence 1 into 2 translations
    const result = mergePartialTranslation({
      previousAlignment,
      previousTargetNonSep,
      affectedGroupIndices: [1],
      apiTranslations: ["A_ctx", "B_new_1", "B_new_2", "C_ctx"],
      apiAlignment: [
        { left: [0], right: [0] },
        { left: [1], right: [1, 2] },
        { left: [2], right: [3] },
      ],
      localToGlobalSourceMap: [0, 1, 2],
    });

    // Group 0: keeps "A_old", Group 1: gets ["B_new_1", "B_new_2"], Group 2: keeps "C_old"
    expect(result.targetNonSep).toEqual([
      "A_old",
      "B_new_1",
      "B_new_2",
      "C_old",
    ]);
    expect(result.alignment).toEqual([
      { left: [0], right: [0] },
      { left: [1], right: [1, 2] },
      { left: [2], right: [3] },
    ]);
  });

  it("handles N:M merge in affected group", () => {
    const previousAlignment: AlignmentGroup[] = [
      { left: [0], right: [0] },
      { left: [1], right: [1] },
      { left: [2], right: [2] },
      { left: [3], right: [3] },
    ];
    const previousTargetNonSep = ["A_old", "B_old", "C_old", "D_old"];

    // Groups 1,2 affected. API merges sentences 1 and 2 into one translation
    const result = mergePartialTranslation({
      previousAlignment,
      previousTargetNonSep,
      affectedGroupIndices: [1, 2],
      apiTranslations: ["A_ctx", "BC_merged", "D_ctx"],
      apiAlignment: [
        { left: [0], right: [0] },
        { left: [1, 2], right: [1] },
        { left: [3], right: [2] },
      ],
      localToGlobalSourceMap: [0, 1, 2, 3],
    });

    // Group 0: keeps "A_old"
    // Group 1 (affected): gets "BC_merged" (API merged 1+2)
    // Group 2 (affected): source indices [2] are in same API group as [1],
    //   translations already consumed by group 1, left includes merged indices
    // Group 3: keeps "D_old"
    expect(result.targetNonSep).toEqual(["A_old", "BC_merged", "D_old"]);
    expect(result.alignment[0]).toEqual({ left: [0], right: [0] });
    expect(result.alignment[1]).toEqual({ left: [1, 2], right: [1] });
    // Group 2 picks up merged source indices from API but translations already consumed
    expect(result.alignment[2]).toEqual({ left: [1, 2], right: [] });
    expect(result.alignment[3]).toEqual({ left: [3], right: [2] });
  });

  it("handles multiple non-contiguous affected groups", () => {
    const previousAlignment: AlignmentGroup[] = [
      { left: [0], right: [0] },
      { left: [1], right: [1] },
      { left: [2], right: [2] },
      { left: [3], right: [3] },
      { left: [4], right: [4] },
    ];
    const previousTargetNonSep = [
      "A_old",
      "B_old",
      "C_old",
      "D_old",
      "E_old",
    ];

    // Groups 1 and 3 affected
    // Expanded: groups 0,1,2 and 2,3,4 → all groups
    const result = mergePartialTranslation({
      previousAlignment,
      previousTargetNonSep,
      affectedGroupIndices: [1, 3],
      apiTranslations: ["A_ctx", "B_new", "C_ctx", "D_new", "E_ctx"],
      apiAlignment: [
        { left: [0], right: [0] },
        { left: [1], right: [1] },
        { left: [2], right: [2] },
        { left: [3], right: [3] },
        { left: [4], right: [4] },
      ],
      localToGlobalSourceMap: [0, 1, 2, 3, 4],
    });

    // Groups 0,2,4: keep old. Groups 1,3: use new.
    expect(result.targetNonSep).toEqual([
      "A_old",
      "B_new",
      "C_old",
      "D_new",
      "E_old",
    ]);
  });
});
