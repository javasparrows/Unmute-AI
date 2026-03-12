"use client";

import { useCallback, useRef } from "react";

/**
 * Ratio-based bidirectional scroll sync between two scrollable containers.
 * Uses requestAnimationFrame and a timeout-based lock to prevent feedback loops.
 */
export function useScrollSync() {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const sourceRef = useRef<"left" | "right" | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncScroll = useCallback(
    (source: "left" | "right") => {
      if (sourceRef.current && sourceRef.current !== source) return;
      sourceRef.current = source;

      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const from = source === "left" ? leftRef.current : rightRef.current;
        const to = source === "left" ? rightRef.current : leftRef.current;

        if (!from || !to) {
          sourceRef.current = null;
          return;
        }

        const maxFrom = from.scrollHeight - from.clientHeight;
        const maxTo = to.scrollHeight - to.clientHeight;

        if (maxFrom <= 0 || maxTo <= 0) {
          sourceRef.current = null;
          return;
        }

        const ratio = from.scrollTop / maxFrom;
        to.scrollTop = ratio * maxTo;

        // Keep the lock briefly to ignore the programmatic scroll event on the target
        lockTimerRef.current = setTimeout(() => {
          sourceRef.current = null;
        }, 50);
      });
    },
    [],
  );

  const handleLeftScroll = useCallback(() => syncScroll("left"), [syncScroll]);
  const handleRightScroll = useCallback(
    () => syncScroll("right"),
    [syncScroll],
  );

  return {
    leftRef,
    rightRef,
    handleLeftScroll,
    handleRightScroll,
  };
}
