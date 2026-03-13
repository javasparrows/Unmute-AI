"use client";

import { useState, useCallback } from "react";
import type { LanguageCode, StructureCheckResult } from "@/types";
import { ParagraphFeedbackComponent } from "./paragraph-feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface StructureCheckDialogProps {
  leftText: string;
  rightText: string;
  leftLang: LanguageCode;
  rightLang: LanguageCode;
}

function getOverallScoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-yellow-600";
  if (score >= 4) return "text-orange-600";
  return "text-red-600";
}

export function StructureCheckDialog({
  leftText,
  rightText,
  leftLang,
  rightLang,
}: StructureCheckDialogProps) {
  const [result, setResult] = useState<StructureCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    // Prefer to check the longer text
    const text = rightText.length > leftText.length ? rightText : leftText;
    const lang = rightText.length > leftText.length ? rightLang : leftLang;

    if (!text.trim()) {
      setCheckError("テキストを入力してください");
      return;
    }

    setIsChecking(true);
    setCheckError(null);
    setResult(null);

    try {
      const res = await fetch("/api/check-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || "構成チェックに失敗しました",
        );
      }

      const data = (await res.json()) as StructureCheckResult;
      setResult(data);
    } catch (err) {
      setCheckError(
        err instanceof Error ? err.message : "構成チェックに失敗しました。もう一度お試しください。",
      );
    } finally {
      setIsChecking(false);
    }
  }, [leftText, rightText, leftLang, rightLang]);

  const hasText = leftText.trim() || rightText.trim();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled={!hasText}
        >
          構成チェック
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>論理構成チェック</DialogTitle>
          <DialogDescription>
            段落ごとの役割、論理フロー、改善提案を確認できます。
          </DialogDescription>
        </DialogHeader>

        {!result && !isChecking && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground text-center">
              AIが論文の論理構成を段落ごとに分析します。
            </p>
            <Button onClick={handleCheck} disabled={!hasText}>
              チェックを開始
            </Button>
          </div>
        )}

        {isChecking && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">分析中...</p>
          </div>
        )}

        {checkError && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{checkError}</p>
            <Button variant="outline" onClick={handleCheck} className="mt-4">
              再試行
            </Button>
          </div>
        )}

        {result && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pe-4">
              {/* Overall score */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <span className="text-sm font-medium">総合スコア</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.summary}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-3xl font-bold",
                    getOverallScoreColor(result.overallScore),
                  )}
                >
                  {result.overallScore}/10
                </span>
              </div>

              {/* Per-paragraph feedback */}
              {result.paragraphs.map((feedback) => (
                <ParagraphFeedbackComponent
                  key={feedback.paragraphIndex}
                  feedback={feedback}
                />
              ))}

              <div className="pt-2">
                <Button variant="outline" onClick={handleCheck} size="sm">
                  再チェック
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
