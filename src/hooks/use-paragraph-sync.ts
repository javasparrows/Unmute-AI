"use client";

import { useState, useCallback } from "react";
import { getCursorParagraphIndex } from "@/lib/paragraph-utils";

interface UseParagraphSyncReturn {
  activeParagraphIndex: number | null;
  activePanel: "left" | "right" | null;
  handleCursorChange: (
    text: string,
    cursorPosition: number,
    panel: "left" | "right",
  ) => void;
  clearHighlight: () => void;
}

export function useParagraphSync(): UseParagraphSyncReturn {
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<"left" | "right" | null>(null);

  const handleCursorChange = useCallback(
    (text: string, cursorPosition: number, panel: "left" | "right") => {
      const index = getCursorParagraphIndex(text, cursorPosition);
      setActiveParagraphIndex(index);
      setActivePanel(panel);
    },
    [],
  );

  const clearHighlight = useCallback(() => {
    setActiveParagraphIndex(null);
    setActivePanel(null);
  }, []);

  return {
    activeParagraphIndex,
    activePanel,
    handleCursorChange,
    clearHighlight,
  };
}
