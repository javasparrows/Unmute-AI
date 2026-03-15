"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ParagraphFlowResult, FlowIssue } from "@/lib/evidence/flow/types";

interface FlowAnalysisPanelProps {
  documentId: string;
  text: string;
  sectionType?: string;
}

const ROLE_COLORS: Record<string, string> = {
  background: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  problem: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  prior_work: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  gap: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approach: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  contribution: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  result: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  interpretation: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  limitation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  transition: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ROLE_LABELS: Record<string, string> = {
  background: "Background",
  problem: "Problem",
  prior_work: "Prior Work",
  gap: "Gap",
  approach: "Approach",
  contribution: "Contribution",
  result: "Result",
  interpretation: "Interpretation",
  limitation: "Limitation",
  transition: "Transition",
  other: "Other",
};

const SEVERITY_ICONS: Record<string, typeof AlertTriangle> = {
  high: AlertTriangle,
  medium: Info,
  low: Info,
};

export function FlowAnalysisPanel({ documentId, text, sectionType }: FlowAnalysisPanelProps) {
  const [result, setResult] = useState<ParagraphFlowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/evidence/flow/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, sectionType, text }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          Analyze the logical flow of paragraphs and detect structural issues
        </p>
        <Button onClick={handleAnalyze} disabled={loading || !text.trim()}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </span>
          ) : (
            "Run Flow Analysis"
          )}
        </Button>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* Overall Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Overall Score</span>
            <span className={cn(
              "text-2xl font-bold",
              result.overallScore >= 70 ? "text-green-600" :
              result.overallScore >= 40 ? "text-amber-600" : "text-red-600",
            )}>
              {result.overallScore}/100
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{result.sectionSummary}</p>
        </CardContent>
      </Card>

      {/* Role Sequence */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Paragraph Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {result.paragraphs.map((p) => (
              <Badge
                key={p.index}
                variant="secondary"
                className={cn("text-xs", ROLE_COLORS[p.role])}
              >
                P{p.index}: {ROLE_LABELS[p.role] ?? p.role}
              </Badge>
            ))}
          </div>
          {result.expectedSequence && (
            <p className="text-xs text-muted-foreground mt-2">
              Expected sequence: {result.expectedSequence}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Issues */}
      {result.issues.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Issues Detected ({result.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.issues.map((issue, i) => (
              <IssueCard key={i} issue={issue} />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No issues detected</p>
          </CardContent>
        </Card>
      )}

      {/* Re-analyze */}
      <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={loading} className="w-full">
        Re-analyze
      </Button>
    </div>
  );
}

function IssueCard({ issue }: { issue: FlowIssue }) {
  const Icon = SEVERITY_ICONS[issue.severity] ?? Info;
  const severityColor = issue.severity === "high" ? "text-red-500" : issue.severity === "medium" ? "text-amber-500" : "text-blue-500";

  return (
    <div className="rounded-md border p-3 space-y-1">
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", severityColor)} />
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">P{issue.paragraphIndex}</Badge>
            <Badge variant="outline" className="text-xs">{issue.type}</Badge>
          </div>
          <p className="text-sm mt-1">{issue.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{issue.suggestion}</p>
          {issue.missingTopics && issue.missingTopics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {issue.missingTopics.map((topic) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
