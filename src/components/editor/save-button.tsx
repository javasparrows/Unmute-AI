"use client";

import { useTransition } from "react";
import { Save, Loader2 } from "lucide-react";
import { saveVersion } from "@/app/actions/version";
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
  provider: string;
  leftRanges: { from: number; to: number }[];
  rightRanges: { from: number; to: number }[];
  onSaved: (versionNumber: number) => void;
}

export function SaveButton({
  documentId,
  sourceText,
  translatedText,
  sourceLang,
  targetLang,
  journal,
  provider,
  leftRanges,
  rightRanges,
  onSaved,
}: SaveButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveVersion({
        documentId,
        sourceText,
        translatedText,
        sourceLang,
        targetLang,
        journal,
        provider,
        leftRanges,
        rightRanges,
      });
      onSaved(result.versionNumber);
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
          保存
        </Button>
      </TooltipTrigger>
      <TooltipContent>新しいバージョンとして保存</TooltipContent>
    </Tooltip>
  );
}
