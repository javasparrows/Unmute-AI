"use client";

import type { TranslationCosts } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GEMINI_INPUT_RATE = 0.15; // $ per 1M tokens (Gemini 2.5 Flash)
const GEMINI_OUTPUT_RATE = 0.6; // $ per 1M tokens (Gemini 2.5 Flash)

interface CostDisplayProps {
  costs: TranslationCosts;
}

export function CostDisplay({ costs }: CostDisplayProps) {
  const costUSD =
    (costs.inputTokens / 1_000_000) * GEMINI_INPUT_RATE +
    (costs.outputTokens / 1_000_000) * GEMINI_OUTPUT_RATE;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 text-xs opacity-80 cursor-default">
          <span className="font-medium opacity-90">Gemini</span>
          <span>${costUSD.toFixed(4)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p>Input: {costs.inputTokens.toLocaleString()} tokens</p>
          <p>Output: {costs.outputTokens.toLocaleString()} tokens</p>
          <p className="text-muted-foreground">
            Input: ${GEMINI_INPUT_RATE}/1M, Output: ${GEMINI_OUTPUT_RATE}/1M
          </p>
          <p className="text-muted-foreground">月次リセット</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
