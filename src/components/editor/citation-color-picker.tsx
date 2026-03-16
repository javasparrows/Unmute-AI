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
import { CITATION_COLORS, type CitationColorId } from "@/hooks/use-citation-color";
import { Check } from "lucide-react";

interface CitationColorPickerProps {
  colorId: CitationColorId;
  onColorChange: (id: CitationColorId) => void;
}

export function CitationColorPicker({
  colorId,
  onColorChange,
}: CitationColorPickerProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center h-5 w-5 rounded-full border border-border/50 transition-transform hover:scale-110 shrink-0"
              style={{
                backgroundColor: CITATION_COLORS.find((c) => c.id === colorId)
                  ?.color,
              }}
            >
              <span className="sr-only">Change citation highlight color</span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          引用ハイライトの色
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex items-center gap-1.5">
          {CITATION_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onColorChange(c.id)}
              className="relative flex items-center justify-center h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              style={{ backgroundColor: c.color }}
              title={c.label}
            >
              {c.id === colorId && (
                <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
