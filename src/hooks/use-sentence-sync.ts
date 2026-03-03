"use client";

import { useState, useCallback } from "react";

interface UseSentenceSyncReturn {
  activeLeftIndices: number[] | null;
  activeRightIndices: number[] | null;
  activePanel: "left" | "right" | null;
  setSentenceGroup: (
    leftIndices: number[] | null,
    rightIndices: number[] | null,
    panel: "left" | "right",
  ) => void;
  clearHighlight: () => void;
}

export function useSentenceSync(): UseSentenceSyncReturn {
  const [activeLeftIndices, setActiveLeftIndices] = useState<number[] | null>(
    null,
  );
  const [activeRightIndices, setActiveRightIndices] = useState<number[] | null>(
    null,
  );
  const [activePanel, setActivePanel] = useState<"left" | "right" | null>(
    null,
  );

  const setSentenceGroup = useCallback(
    (
      leftIndices: number[] | null,
      rightIndices: number[] | null,
      panel: "left" | "right",
    ) => {
      setActiveLeftIndices(leftIndices);
      setActiveRightIndices(rightIndices);
      setActivePanel(panel);
    },
    [],
  );

  const clearHighlight = useCallback(() => {
    setActiveLeftIndices(null);
    setActiveRightIndices(null);
    setActivePanel(null);
  }, []);

  return {
    activeLeftIndices,
    activeRightIndices,
    activePanel,
    setSentenceGroup,
    clearHighlight,
  };
}
