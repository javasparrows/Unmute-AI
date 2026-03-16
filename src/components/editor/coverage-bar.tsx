"use client";

import type { ReactNode } from "react";
import { FileText, Type, BookOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoverageBarProps {
  citationCount: number;
  paragraphCount: number;
  leftSentenceCounts: number[];
  rightSentenceCounts: number[];
  onOpenEvidence: () => void;
  /** Optional slot rendered after the citation count (e.g. color picker) */
  extra?: ReactNode;
}

export function CoverageBar({
  citationCount,
  paragraphCount,
  leftSentenceCounts,
  rightSentenceCounts,
  onOpenEvidence,
  extra,
}: CoverageBarProps) {
  const leftTotal = leftSentenceCounts.reduce((a, b) => a + b, 0);
  const rightTotal = rightSentenceCounts.reduce((a, b) => a + b, 0);

  const formatCounts = (counts: number[]): string =>
    counts.length > 0 ? `(${counts.join(", ")})` : "";

  return (
    <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-1.5">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {paragraphCount} 段落
        </span>
        <span className="flex items-center gap-1">
          <Type className="h-3.5 w-3.5" />
          原文 {leftTotal} 文 {formatCounts(leftSentenceCounts)} / 翻訳 {rightTotal} 文 {formatCounts(rightSentenceCounts)}
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
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs"
        onClick={onOpenEvidence}
      >
        引用を検索
      </Button>
    </div>
  );
}
