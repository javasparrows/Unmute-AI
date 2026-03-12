import { describe, it, expect } from "vitest";
import {
  splitSentences,
  joinSentences,
  computeSentenceRanges,
  detectChangedSentences,
} from "../split-sentences";

describe("splitSentences", () => {
  it("splits on sentence-ending punctuation", () => {
    expect(splitSentences("Hello. World.")).toEqual(["Hello.", " World."]);
  });

  it("handles paragraph separators", () => {
    expect(splitSentences("A.\n\nB.")).toEqual(["A.", "\n\n", "B."]);
  });

  it("handles Japanese punctuation", () => {
    expect(splitSentences("細胞を培養した。結果は有意であった。")).toEqual([
      "細胞を培養した。",
      "結果は有意であった。",
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(splitSentences("")).toEqual([]);
  });
});

describe("joinSentences", () => {
  it("joins tokens back into text", () => {
    const tokens = ["Hello.", " World.", "\n\n", "OK."];
    expect(joinSentences(tokens)).toBe("Hello. World.\n\nOK.");
  });
});

describe("detectChangedSentences", () => {
  it("detects changed sentences by index", () => {
    const prev = ["Hello.", " World."];
    const curr = ["Hello.", " Changed."];
    expect(detectChangedSentences(prev, curr)).toEqual([1]);
  });

  it("returns empty when nothing changed", () => {
    const tokens = ["A.", " B."];
    expect(detectChangedSentences(tokens, tokens)).toEqual([]);
  });

  it("detects added sentences", () => {
    const prev = ["A."];
    const curr = ["A.", " B."];
    expect(detectChangedSentences(prev, curr)).toEqual([1]);
  });

  it("ignores separators in comparison", () => {
    const prev = ["A.", "\n\n", "B."];
    const curr = ["A.", "\n\n", "B_changed."];
    expect(detectChangedSentences(prev, curr)).toEqual([1]);
  });
});

describe("computeSentenceRanges", () => {
  it("computes char-offset ranges for non-separator tokens", () => {
    const tokens = ["Hello.", " World.", "\n\n", "OK."];
    const ranges = computeSentenceRanges(tokens);
    expect(ranges).toEqual([
      { from: 0, to: 6 },
      { from: 6, to: 13 },
      // separator "\n\n" is skipped
      { from: 15, to: 18 },
    ]);
  });
});
