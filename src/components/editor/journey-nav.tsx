"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Check, Circle, Loader2, SkipForward, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PHASES, TASKS, getTasksForPhase, getProgress, type TaskDefinition } from "@/lib/journey/task-registry";

interface JourneyData {
  currentPhase: number;
  currentTask: string;
  phaseStatuses: Record<string, string>;
  taskStatuses: Record<string, string>;
  guideVisible: boolean;
}

interface JourneyNavProps {
  documentId: string;
  onTaskClick?: (task: TaskDefinition) => void;
}

export function JourneyNav({ documentId, onTaskClick }: JourneyNavProps) {
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchJourney = useCallback(async () => {
    try {
      const res = await fetch(`/api/v2/journey/${documentId}`);
      if (res.ok) {
        const data = await res.json();
        setJourney(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchJourney();
    // Poll every 30 seconds for auto-completion updates
    const interval = setInterval(fetchJourney, 30000);
    return () => clearInterval(interval);
  }, [fetchJourney]);

  const handleCompleteTask = async (taskId: string) => {
    const res = await fetch(`/api/v2/journey/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completeTask: taskId }),
    });
    if (res.ok) {
      const data = await res.json();
      setJourney(data);
    }
  };

  const handleSkipTask = async (taskId: string) => {
    const res = await fetch(`/api/v2/journey/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipTask: taskId }),
    });
    if (res.ok) {
      const data = await res.json();
      setJourney(data);
    }
  };

  const handleToggleGuide = async () => {
    if (!journey) return;
    const res = await fetch(`/api/v2/journey/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guideVisible: !journey.guideVisible }),
    });
    if (res.ok) {
      const data = await res.json();
      setJourney(data);
    }
  };

  if (loading) return null;
  if (!journey) return null;

  if (!journey.guideVisible) {
    return (
      <div className="flex items-center justify-end border-b bg-muted/10 px-4 py-1">
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleToggleGuide}>
          <Eye className="h-3 w-3" />
          ガイドを表示
        </Button>
      </div>
    );
  }

  const progress = getProgress(journey.taskStatuses);
  const currentPhase = PHASES.find((p) => p.phase === journey.currentPhase);
  const currentTask = TASKS.find((t) => t.id === journey.currentTask);

  return (
    <div className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
      {/* Collapsed bar */}
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Phase dots */}
        <div className="flex items-center gap-1">
          {PHASES.map((phase) => {
            const status = journey.phaseStatuses[String(phase.phase)] ?? "not_started";
            return (
              <button
                key={phase.phase}
                onClick={() => setExpanded(!expanded)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-all",
                  status === "completed" ? "bg-green-500" :
                  status === "in_progress" ? "bg-primary animate-pulse" :
                  "bg-muted-foreground/30",
                )}
                title={`Phase ${phase.phase}: ${phase.name}`}
              />
            );
          })}
        </div>

        {/* Current position */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm flex-1 min-w-0"
        >
          <Badge variant="outline" className="text-xs shrink-0">
            {journey.currentTask}
          </Badge>
          <span className="font-medium truncate">
            {currentPhase?.name}: {currentTask?.name}
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {progress.completed}/{progress.total}
          </span>
          <div className="h-1.5 w-16 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleToggleGuide}>
            <EyeOff className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Expanded phase detail */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          {PHASES.map((phase) => {
            const status = journey.phaseStatuses[String(phase.phase)] ?? "not_started";
            const tasks = getTasksForPhase(phase.phase);
            const isCurrentPhase = phase.phase === journey.currentPhase;

            return (
              <div key={phase.phase} className={cn(
                "rounded-lg p-3",
                isCurrentPhase ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/30",
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <PhaseIcon status={status} />
                  <span className={cn("text-sm font-medium", isCurrentPhase && "text-primary")}>
                    Phase {phase.phase}: {phase.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {phase.estimatedHours}h
                  </span>
                </div>
                <div className="space-y-1 ml-6">
                  {tasks.map((task) => {
                    const taskStatus = journey.taskStatuses[task.id] ?? "not_started";
                    const isCurrentTask = task.id === journey.currentTask;
                    return (
                      <div key={task.id} className="flex items-center gap-2 group">
                        <TaskIcon status={taskStatus} />
                        <button
                          className={cn(
                            "text-xs flex-1 text-left truncate",
                            isCurrentTask ? "font-medium text-primary" :
                            taskStatus === "completed" ? "text-muted-foreground line-through" :
                            taskStatus === "skipped" ? "text-muted-foreground/50 line-through" :
                            "text-foreground",
                          )}
                          onClick={() => onTaskClick?.(task)}
                        >
                          {task.id} {task.name}
                        </button>
                        {taskStatus !== "completed" && taskStatus !== "skipped" && (
                          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => handleCompleteTask(task.id)}
                              title="完了にする"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => handleSkipTask(task.id)}
                              title="スキップ"
                            >
                              <SkipForward className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhaseIcon({ status }: { status: string }) {
  if (status === "completed") return <Check className="h-4 w-4 text-green-500" />;
  if (status === "in_progress") return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
  return <Circle className="h-4 w-4 text-muted-foreground/30" />;
}

function TaskIcon({ status }: { status: string }) {
  if (status === "completed") return <Check className="h-3 w-3 text-green-500" />;
  if (status === "skipped") return <SkipForward className="h-3 w-3 text-muted-foreground/30" />;
  if (status === "in_progress") return <Circle className="h-3 w-3 text-primary fill-primary/20" />;
  return <Circle className="h-3 w-3 text-muted-foreground/20" />;
}
