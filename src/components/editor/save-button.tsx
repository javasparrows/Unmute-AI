"use client";

import { useTransition } from "react";
import { Save, Loader2 } from "lucide-react";
import { saveVersion } from "@/app/actions/version";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SaveButtonProps {
  documentId: string;
  currentVersionNumber: number;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  journal: string;
  leftRanges: { from: number; to: number }[];
  rightRanges: { from: number; to: number }[];
  sentenceAlignments?: { left: number[]; right: number[] }[];
  onSaved: (versionNumber: number) => void;
}

export function SaveButton({
  documentId,
  sourceText,
  translatedText,
  sourceLang,
  targetLang,
  journal,
  leftRanges,
  rightRanges,
  sentenceAlignments,
  onSaved,
}: SaveButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await saveVersion({
          documentId,
          sourceText,
          translatedText,
          sourceLang,
          targetLang,
          journal,
          provider: "gemini",
          leftRanges,
          rightRanges,
          sentenceAlignments,
        });
        onSaved(result.versionNumber);
      } catch (err) {
        const message = err instanceof Error ? err.message : "保存に失敗しました";
        toast.error(message, {
          action: {
            label: "プランを確認",
            onClick: () => window.open("/pricing", "_blank"),
          },
        });
      }
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isPending || (!sourceText.trim() && !translatedText.trim())}
          className="gap-1.5"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">保存</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>新しいバージョンとして保存</TooltipContent>
    </Tooltip>
  );
}
