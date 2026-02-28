"use client";

import type { ParagraphFeedback as ParagraphFeedbackType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ParagraphFeedbackProps {
  feedback: ParagraphFeedbackType;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (score >= 4) return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function ParagraphFeedbackComponent({ feedback }: ParagraphFeedbackProps) {
  return (
    <div className="space-y-2 p-4 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            段落 {feedback.paragraphIndex + 1}
          </span>
          <Badge variant="secondary" className="text-xs">
            {feedback.role}
          </Badge>
        </div>
        <span
          className={cn(
            "text-sm font-semibold px-2 py-0.5 rounded border",
            getScoreColor(feedback.score),
          )}
        >
          {feedback.score}/10
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{feedback.logicFlow}</p>
      {feedback.suggestions.length > 0 && (
        <ul className="space-y-1">
          {feedback.suggestions.map((suggestion, i) => (
            <li key={i} className="text-sm text-foreground/80 flex gap-2">
              <span className="text-primary shrink-0">•</span>
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
