"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PomodoroTimerProps {
  documentId: string;
  onSessionStart?: () => void;
  onSessionEnd?: (stats: { wordsWritten: number; pomodoroCount: number }) => void;
}

type TimerMode = "idle" | "focus" | "break";

export function PomodoroTimer({ documentId, onSessionEnd }: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>("idle");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const FOCUS_MINUTES = 25;
  const BREAK_MINUTES = 5;

  const startSession = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.id);
      }
    } catch {
      // Continue without session tracking
    }
  }, [documentId]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch("/api/v2/sessions/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, pomodoroCount }),
      });
      if (res.ok) {
        const data = await res.json();
        onSessionEnd?.({ wordsWritten: data.wordsWritten ?? 0, pomodoroCount });
      }
    } catch {
      // Silently fail
    }
    setSessionId(null);
  }, [sessionId, pomodoroCount, onSessionEnd]);

  const handleStart = () => {
    if (mode === "idle") {
      setMode("focus");
      setSecondsLeft(FOCUS_MINUTES * 60);
      startSession();
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setMode("idle");
    setSecondsLeft(FOCUS_MINUTES * 60);
    setPomodoroCount(0);
    endSession();
  };

  // Timer tick
  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, secondsLeft]);

  // Handle timer completion
  useEffect(() => {
    if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      if (mode === "focus") {
        setPomodoroCount((prev) => prev + 1);
        setMode("break");
        setSecondsLeft(BREAK_MINUTES * 60);
        // Auto-start break
        setTimeout(() => setIsRunning(true), 500);
      } else if (mode === "break") {
        setMode("focus");
        setSecondsLeft(FOCUS_MINUTES * 60);
        // Auto-start next focus
        setTimeout(() => setIsRunning(true), 500);
      }
    }
  }, [secondsLeft, isRunning, mode]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${minutes}:${String(seconds).padStart(2, "0")}`;

  if (mode === "idle") {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs text-muted-foreground"
        onClick={handleStart}
      >
        <Timer className="h-3.5 w-3.5" />
        Pomodoro
      </Button>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
      mode === "focus" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-600",
    )}>
      {mode === "focus" ? (
        <Timer className="h-3.5 w-3.5" />
      ) : (
        <Coffee className="h-3.5 w-3.5" />
      )}
      <span className="font-mono font-medium w-10 text-center">{timeDisplay}</span>
      <span className="text-muted-foreground">#{pomodoroCount + 1}</span>

      {isRunning ? (
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={handlePause}>
          <Pause className="h-3 w-3" />
        </Button>
      ) : (
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={handleStart}>
          <Play className="h-3 w-3" />
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={handleReset}>
        <RotateCcw className="h-3 w-3" />
      </Button>
    </div>
  );
}
