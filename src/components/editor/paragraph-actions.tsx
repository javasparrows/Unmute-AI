"use client";

import { Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ParagraphActionsProps {
  onFindCitations: () => void;
  onCheckEvidence: () => void;
  onDraftWithAI: () => void;
}

export function ParagraphActions({
  onFindCitations,
  onCheckEvidence,
  onDraftWithAI,
}: ParagraphActionsProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border bg-background shadow-sm p-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onFindCitations}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">引用を検索</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCheckEvidence}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">エビデンスを確認</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDraftWithAI}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">AIで下書き</TooltipContent>
      </Tooltip>
    </div>
  );
}
