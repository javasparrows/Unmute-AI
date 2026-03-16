"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseResizablePanelsOptions {
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  storageKey?: string;
}

export function useResizablePanels(options: UseResizablePanelsOptions = {}) {
  const {
    defaultRatio = 0.5,
    minRatio = 0.2,
    maxRatio = 0.8,
    storageKey,
  } = options;

  const [ratio, setRatio] = useState<number>(() => {
    if (storageKey && typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= minRatio && parsed <= maxRatio) {
          return parsed;
        }
      }
    }
    return defaultRatio;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const ratioRef = useRef(ratio);

  // Keep ratioRef in sync
  useEffect(() => {
    ratioRef.current = ratio;
  }, [ratio]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  const handleTouchStart = useCallback(
    () => {
      isDragging.current = true;
      document.body.style.userSelect = "none";
    },
    [],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newRatio = Math.min(maxRatio, Math.max(minRatio, x / rect.width));
      setRatio(newRatio);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const newRatio = Math.min(maxRatio, Math.max(minRatio, x / rect.width));
      setRatio(newRatio);
    };

    const handleEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Persist current ratio
      if (storageKey) {
        localStorage.setItem(storageKey, ratioRef.current.toString());
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  }, [minRatio, maxRatio, storageKey]);

  // Also save on ratio change (covers programmatic changes)
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, ratio.toString());
    }
  }, [ratio, storageKey]);

  return {
    ratio,
    containerRef,
    isDragging,
    handleMouseDown,
    handleTouchStart,
  };
}
