"use client";

import type { ReactNode } from "react";
import { FileText, Type, BookOpen, AlertTriangle, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CursorInfo {
  panel: "left" | "right";
  paragraphIndex: number;
  sentenceInParagraph: number;
  globalSentenceIndex: number;
}

interface CoverageBarProps {
  citationCount: number;
  paragraphCount: number;
  leftSentenceCounts: number[];
  rightSentenceCounts: number[];
  cursorInfo: CursorInfo | null;
  onOpenEvidence: () => void;
  /** Optional slot rendered after the citation count (e.g. color picker) */
  extra?: ReactNode;
}

export function CoverageBar({
  citationCount,
  paragraphCount,
  leftSentenceCounts,
  rightSentenceCounts,
  cursorInfo,
  onOpenEvidence,
  extra,
}: CoverageBarProps) {
  const leftTotal = leftSentenceCounts.reduce((a, b) => a + b, 0);
  const rightTotal = rightSentenceCounts.reduce((a, b) => a + b, 0);

  const formatCounts = (counts: number[], activeParagraph?: number): ReactNode => {
    if (counts.length === 0) return "";
    return (
      <span>
        (
        {counts.map((c, i) => (
          <span key={i}>
            {i > 0 && ", "}
            <span
              className={
                activeParagraph === i + 1
                  ? "font-bold text-foreground bg-primary/20 px-0.5 rounded"
                  : ""
              }
            >
              {c}
            </span>
          </span>
        ))}
        )
      </span>
    );
  };

  const leftActive = cursorInfo?.panel === "left" ? cursorInfo.paragraphIndex : undefined;
  const rightActive = cursorInfo?.panel === "right" ? cursorInfo.paragraphIndex : undefined;

  return (
    <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-1.5">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {paragraphCount} 段落
        </span>
        <span className="flex items-center gap-1">
          <Type className="h-3.5 w-3.5" />
          原文 {leftTotal} 文 {formatCounts(leftSentenceCounts, leftActive)}
          <span className="mx-0.5">/</span>
          翻訳 {rightTotal} 文 {formatCounts(rightSentenceCounts, rightActive)}
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          {citationCount > 0
            ? `${citationCount} 件の引用`
            : "引用なし"}
        </span>
        {citationCount === 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            引用を追加しましょう
          </span>
        )}
        {extra}
      </div>

      <div className="flex items-center gap-3">
        {/* Cursor position indicator pill */}
        {cursorInfo ? (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-0.5 text-xs font-medium text-primary transition-all duration-200">
            <Crosshair className="h-3 w-3" />
            <span>{cursorInfo.panel === "left" ? "原文" : "翻訳"}</span>
            <span className="text-primary/60">&middot;</span>
            <span>{cursorInfo.paragraphIndex}段落</span>
            <span className="text-primary/60">&middot;</span>
            <span>{cursorInfo.sentenceInParagraph}文目</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-0.5 text-xs text-muted-foreground/50 transition-all duration-200">
            <Crosshair className="h-3 w-3" />
            <span>&mdash;</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={onOpenEvidence}
        >
          引用を検索
        </Button>
      </div>
    </div>
  );
}
