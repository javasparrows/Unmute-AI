"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HIGHLIGHT_COLORS, type HighlightColorId } from "@/hooks/use-highlight-colors";
import { Check } from "lucide-react";

interface HighlightColorPickerProps {
  citationColorId: HighlightColorId;
  sentenceColorId: HighlightColorId;
  citationColor: string;
  sentenceColor: string;
  onCitationColorChange: (id: HighlightColorId) => void;
  onSentenceColorChange: (id: HighlightColorId) => void;
}

export function HighlightColorPicker({
  citationColorId,
  sentenceColorId,
  citationColor,
  sentenceColor,
  onCitationColorChange,
  onSentenceColorChange,
}: HighlightColorPickerProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center h-6 gap-0.5 px-1 rounded-full border border-border/50 transition-transform hover:scale-110 shrink-0"
            >
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: sentenceColor }}
              />
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: citationColor }}
              />
              <span className="sr-only">Change highlight colors</span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          ハイライトの色
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">文章</div>
            <div className="flex items-center gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSentenceColorChange(c.id)}
                  className="relative flex items-center justify-center h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                >
                  {c.id === sentenceColorId && (
                    <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">引用</div>
            <div className="flex items-center gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onCitationColorChange(c.id)}
                  className="relative flex items-center justify-center h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                >
                  {c.id === citationColorId && (
                    <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
