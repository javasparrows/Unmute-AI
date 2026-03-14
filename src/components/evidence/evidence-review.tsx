"use client";

import { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ReviewSeverity, ReviewType } from "@/types/evidence";

interface ReviewFinding {
  severity: ReviewSeverity;
  type: ReviewType;
  explanation: string;
  suggestedFix?: string;
}

interface EvidenceReviewProps {
  documentId: string;
}

const SEVERITY_ICON: Record<ReviewSeverity, React.ReactNode> = {
  BLOCKER: <AlertCircle className="h-4 w-4 text-red-500" />,
  MAJOR: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  MINOR: <Info className="h-4 w-4 text-blue-500" />,
};

const SEVERITY_BADGE_VARIANT: Record<
  ReviewSeverity,
  "destructive" | "secondary" | "outline"
> = {
  BLOCKER: "destructive",
  MAJOR: "secondary",
  MINOR: "outline",
};

type Verdict = "PASS" | "BLOCKED" | "NEEDS_REVISION";

export function EvidenceReview({ documentId }: EvidenceReviewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [findings, setFindings] = useState<ReviewFinding[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  async function runReview() {
    setIsRunning(true);
    setFindings([]);
    setVerdict(null);

    try {
      // TODO: Get draft text from editor context
      const res = await fetch("/api/evidence/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          draftText: "", // Will be connected to editor state
          section: "INTRODUCTION",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFindings(data.findings || []);
        setVerdict(data.overallVerdict);
      }
    } catch {
      // Handle error
    } finally {
      setIsRunning(false);
    }
  }

  function getVerdictStyle(v: Verdict): string {
    switch (v) {
      case "PASS":
        return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
      case "BLOCKED":
        return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
      case "NEEDS_REVISION":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    }
  }

  function getVerdictMessage(v: Verdict): string {
    switch (v) {
      case "PASS":
        return "All checks passed";
      case "BLOCKED":
        return "Issues found \u2014 revision required";
      case "NEEDS_REVISION":
        return "Needs revision";
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Button
        onClick={runReview}
        disabled={isRunning}
        className="w-full gap-2"
        size="sm"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Reviewing...
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Run Review
          </>
        )}
      </Button>

      {verdict && (
        <div className={`text-center p-3 rounded-lg ${getVerdictStyle(verdict)}`}>
          <p className="text-sm font-medium">{getVerdictMessage(verdict)}</p>
        </div>
      )}

      {findings.length > 0 && (
        <div className="space-y-2">
          {findings.map((finding, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                {SEVERITY_ICON[finding.severity]}
                <Badge
                  variant={SEVERITY_BADGE_VARIANT[finding.severity]}
                  className="text-xs"
                >
                  {finding.type}
                </Badge>
              </div>
              <p className="text-xs text-foreground/80">{finding.explanation}</p>
              {finding.suggestedFix && (
                <p className="text-xs text-muted-foreground italic">
                  Suggestion: {finding.suggestedFix}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!isRunning && findings.length === 0 && !verdict && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Run a review to check your draft
          </p>
        </div>
      )}
    </div>
  );
}
