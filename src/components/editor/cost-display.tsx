"use client";

import type { TranslationCosts } from "@/types";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DEEPL_FREE_LIMIT = 500_000;
const GEMINI_INPUT_RATE = 0.075; // $ per 1M tokens
const GEMINI_OUTPUT_RATE = 0.3; // $ per 1M tokens

interface CostDisplayProps {
  costs: TranslationCosts;
}

export function CostDisplay({ costs }: CostDisplayProps) {
  const deeplPercentage = Math.min(
    (costs.deepl.characters / DEEPL_FREE_LIMIT) * 100,
    100,
  );

  const geminiCostUSD =
    (costs.gemini.inputTokens / 1_000_000) * GEMINI_INPUT_RATE +
    (costs.gemini.outputTokens / 1_000_000) * GEMINI_OUTPUT_RATE;

  return (
    <div className="flex items-center gap-4 text-xs opacity-80">
      {/* DeepL usage */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-default">
            <span className="font-medium opacity-90">DeepL</span>
            <Progress
              value={deeplPercentage}
              className="w-20 h-1.5"
            />
            <span>{deeplPercentage.toFixed(0)}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>
              {costs.deepl.characters.toLocaleString()} /{" "}
              {DEEPL_FREE_LIMIT.toLocaleString()} 文字
            </p>
            <p className="text-muted-foreground">無料枠 (月次リセット)</p>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Gemini cost */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-default">
            <span className="font-medium opacity-90">Gemini</span>
            <span>${geminiCostUSD.toFixed(4)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>Input: {costs.gemini.inputTokens.toLocaleString()} tokens</p>
            <p>Output: {costs.gemini.outputTokens.toLocaleString()} tokens</p>
            <p className="text-muted-foreground">
              Input: ${GEMINI_INPUT_RATE}/1M tokens, Output: $
              {GEMINI_OUTPUT_RATE}/1M tokens
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
