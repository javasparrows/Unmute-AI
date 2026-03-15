"use client";

import { BookOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoverageBarProps {
  citationCount: number;
  onOpenEvidence: () => void;
}

export function CoverageBar({ citationCount, onOpenEvidence }: CoverageBarProps) {
  return (
    <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-1.5">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
