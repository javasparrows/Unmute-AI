"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ClipboardCopy,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  ComplianceResult,
  ComplianceItemResult,
} from "@/lib/guidelines/check-compliance";

interface CompliancePanelProps {
  documentId: string;
  text: string;
}

const GUIDELINE_OPTIONS = [
  { id: "CONSORT-AI", label: "CONSORT-AI (AI臨床試験)" },
  { id: "TRIPOD-AI", label: "TRIPOD+AI (予測モデル)" },
  { id: "CLAIM", label: "CLAIM (医療画像AI)" },
  { id: "STARD-AI", label: "STARD-AI (診断精度)" },
  { id: "GAMER", label: "GAMER (生成AI使用)" },
];

export function CompliancePanel({ documentId, text }: CompliancePanelProps) {
  const [selectedGuideline, setSelectedGuideline] = useState<string>("");
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [disclosure, setDisclosure] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!selectedGuideline) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v2/evidence/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          guidelineId: selectedGuideline,
          text,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDisclosure = async () => {
    try {
      const res = await fetch("/api/v2/evidence/gamer-disclosure");
      if (res.ok) {
        const data = await res.json();
        setDisclosure(data.disclosure);
      }
    } catch {
      // Handle silently
    }
  };

  const handleCopyDisclosure = () => {
    if (disclosure) {
      navigator.clipboard.writeText(disclosure);
    }
  };

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* Guideline selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            ガイドライン準拠チェック
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={selectedGuideline}
            onValueChange={setSelectedGuideline}
          >
            <SelectTrigger>
              <SelectValue placeholder="ガイドラインを選択..." />
            </SelectTrigger>
            <SelectContent>
              {GUIDELINE_OPTIONS.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCheck}
            disabled={!selectedGuideline || loading || !text.trim()}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                チェック中...
              </span>
            ) : (
              "準拠チェックを実行"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{result.guidelineName} 準拠スコア</span>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    result.score >= 80
                      ? "text-green-600"
                      : result.score >= 50
                        ? "text-amber-600"
                        : "text-red-600",
                  )}
                >
                  {result.score}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {result.metCount}/{result.totalCount} 項目が充足
              </p>
              <div className="h-2 w-full rounded-full bg-muted mt-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    result.score >= 80
                      ? "bg-green-500"
                      : result.score >= 50
                        ? "bg-amber-500"
                        : "bg-red-500",
                  )}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {result.results.map((item) => (
              <ComplianceItemCard key={item.itemId} item={item} />
            ))}
          </div>
        </>
      )}

      {/* GAMER Disclosure */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">GAMER AI使用開示文</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {disclosure ? (
            <>
              <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap">
                {disclosure}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopyDisclosure}
              >
                <ClipboardCopy className="h-3.5 w-3.5" />
                コピー
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateDisclosure}
            >
              開示文を生成
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceItemCard({ item }: { item: ComplianceItemResult }) {
  const statusIcon = {
    met: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    partially_met: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    not_met: <XCircle className="h-4 w-4 text-red-500" />,
    not_applicable: (
      <Badge variant="secondary" className="text-xs">
        N/A
      </Badge>
    ),
  }[item.status];

  const statusLabel = {
    met: "充足",
    partially_met: "部分的",
    not_met: "未充足",
    not_applicable: "該当なし",
  }[item.status];

  return (
    <div
      className={cn(
        "rounded-md border p-3 space-y-1",
        item.status === "not_met" &&
          "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
        item.status === "partially_met" &&
          "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs shrink-0">
              {item.itemId}
            </Badge>
            <Badge variant="outline" className="text-xs shrink-0">
              {item.section}
            </Badge>
            <Badge variant="secondary" className="text-xs shrink-0">
              {statusLabel}
            </Badge>
          </div>
          <p className="text-xs mt-1 font-medium">{item.requirement}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {item.explanation}
          </p>
          {item.location && (
            <p className="text-xs text-muted-foreground mt-1">
              {item.location}
            </p>
          )}
          {item.suggestion && (
            <p className="text-xs text-primary mt-1">{item.suggestion}</p>
          )}
        </div>
      </div>
    </div>
  );
}
