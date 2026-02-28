"use client";

import { useState, useCallback } from "react";

interface UseSentenceSyncReturn {
  activeSentenceIndex: number | null;
  activePanel: "left" | "right" | null;
  setSentence: (index: number, panel: "left" | "right") => void;
  clearHighlight: () => void;
}

export function useSentenceSync(): UseSentenceSyncReturn {
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<
    number | null
  >(null);
  const [activePanel, setActivePanel] = useState<"left" | "right" | null>(
    null,
  );

  const setSentence = useCallback(
    (index: number, panel: "left" | "right") => {
      setActiveSentenceIndex(index);
      setActivePanel(panel);
    },
    [],
  );

  const clearHighlight = useCallback(() => {
    setActiveSentenceIndex(null);
    setActivePanel(null);
  }, []);

  return {
    activeSentenceIndex,
    activePanel,
    setSentence,
    clearHighlight,
  };
}
