"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check, ChevronRight, ChevronLeft,
  Loader2, SkipForward, Clock, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PHASES, TASKS, getTasksForPhase, getProgress, type TaskDefinition } from "@/lib/journey/task-registry";

interface JourneyData {
  currentPhase: number;
  currentTask: string;
  phaseStatuses: Record<string, string>;
  taskStatuses: Record<string, string>;
  guideVisible: boolean;
}

interface JourneySidebarProps {
  documentId: string;
  onTaskClick?: (task: TaskDefinition) => void;
  className?: string;
}

export function JourneySidebar({ documentId, onTaskClick, className }: JourneySidebarProps) {
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [collapsed, setCollapsed] = useState(false);
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
    const interval = setInterval(fetchJourney, 30000);
    return () => clearInterval(interval);
  }, [fetchJourney]);

  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/v2/journey/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completeTask: taskId }),
    });
    if (res.ok) setJourney(await res.json());
  };

  const handleSkipTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/v2/journey/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipTask: taskId }),
    });
    if (res.ok) setJourney(await res.json());
  };

  if (loading || !journey) {
    return (
      <div className={cn("border-r bg-muted/10 flex items-center justify-center", collapsed ? "w-12" : "w-72", className)}>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  const progress = getProgress(journey.taskStatuses);

  // Collapsed view -- just dots
  if (collapsed) {
    return (
      <div className={cn("w-12 border-r bg-muted/10 flex flex-col items-center py-3 shrink-0", className)}>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 mb-3" onClick={() => setCollapsed(false)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <div className="flex flex-col items-center gap-2 flex-1">
          {PHASES.map((phase) => {
            const status = journey.phaseStatuses[String(phase.phase)] ?? "not_started";
            return (
              <div
                key={phase.phase}
                className={cn(
                  "h-3 w-3 rounded-full transition-all",
                  status === "completed" ? "bg-green-500" :
                  status === "in_progress" ? "bg-primary animate-pulse" :
                  "bg-muted-foreground/20",
                )}
                title={`Phase ${phase.phase}: ${phase.name}`}
              />
            );
          })}
        </div>
        <span className="text-[10px] text-muted-foreground mt-2">{progress.percentage}%</span>
      </div>
    );
  }

  // Expanded view
  const currentTask = TASKS.find((t) => t.id === journey.currentTask);

  return (
    <div className={cn("w-72 border-r bg-muted/10 flex flex-col shrink-0 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-xs font-semibold text-foreground">Paper Writing Journey</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCollapsed(true)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="px-3 py-2 border-b">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">Overall Progress</span>
          <span className="text-xs font-medium">{progress.percentage}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Phase tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {PHASES.map((phase, phaseIdx) => {
          const phaseStatus = journey.phaseStatuses[String(phase.phase)] ?? "not_started";
          const tasks = getTasksForPhase(phase.phase);
          const isCurrentPhase = phase.phase === journey.currentPhase;

          return (
            <div key={phase.phase} className="relative">
              {/* Phase header */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5",
                isCurrentPhase && "bg-primary/5",
              )}>
                {/* Connection line from previous phase */}
                {phaseIdx > 0 && (
                  <div className={cn(
                    "absolute left-[19px] -top-2 h-2 w-0.5",
                    phaseStatus === "completed" || phaseStatus === "in_progress"
                      ? "bg-green-500" : "bg-muted-foreground/15",
                  )} />
                )}

                {/* Phase dot */}
                <div className={cn(
                  "h-4 w-4 rounded-full flex items-center justify-center shrink-0 z-10",
                  phaseStatus === "completed" ? "bg-green-500" :
                  phaseStatus === "in_progress" ? "bg-primary ring-2 ring-primary/30" :
                  "bg-muted-foreground/20",
                )}>
                  {phaseStatus === "completed" && <Check className="h-2.5 w-2.5 text-white" />}
                </div>

                <span className={cn(
                  "text-xs font-medium flex-1",
                  phaseStatus === "completed" ? "text-muted-foreground" :
                  isCurrentPhase ? "text-primary" :
                  "text-foreground",
                )}>
                  {phase.name}
                </span>

                <span className="text-[10px] text-muted-foreground">{phase.estimatedHours}h</span>
              </div>

              {/* Tasks */}
              <div className="relative ml-[19px] pl-4">
                {/* Vertical connection line */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-0.5 -translate-x-[1px]",
                    phaseStatus === "completed"
                      ? "bg-green-500"
                      : phaseStatus === "in_progress"
                        ? "bg-primary/40"
                        : "bg-transparent",
                  )}
                  style={
                    phaseStatus !== "completed" && phaseStatus !== "in_progress"
                      ? { borderLeft: "1px dashed var(--color-muted-foreground)", opacity: 0.2 }
                      : undefined
                  }
                />

                {tasks.map((task) => {
                  const taskStatus = journey.taskStatuses[task.id] ?? "not_started";
                  const isCurrentTask = task.id === journey.currentTask;

                  return (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        "flex items-center gap-2 w-full text-left px-2 py-1 rounded-sm transition-colors group relative",
                        isCurrentTask ? "bg-primary/10" : "hover:bg-muted/50",
                      )}
                    >
                      {/* Task dot */}
                      <div className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0 relative z-10 -ml-[13px]",
                        taskStatus === "completed" ? "bg-green-500" :
                        taskStatus === "skipped" ? "bg-muted-foreground/30" :
                        isCurrentTask ? "bg-primary ring-2 ring-primary/30 animate-pulse" :
                        "bg-muted-foreground/20",
                      )}>
                        {taskStatus === "completed" && (
                          <Check className="h-2 w-2 text-white absolute top-[1px] left-[1px]" />
                        )}
                      </div>

                      {/* Task label */}
                      <span className={cn(
                        "text-[11px] flex-1 leading-tight",
                        taskStatus === "completed" ? "text-muted-foreground line-through" :
                        taskStatus === "skipped" ? "text-muted-foreground/50 line-through" :
                        isCurrentTask ? "text-primary font-medium" :
                        "text-foreground",
                      )}>
                        {task.name}
                      </span>

                      {/* Actions on hover */}
                      {taskStatus !== "completed" && taskStatus !== "skipped" && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0">
                          <button
                            onClick={(e) => handleCompleteTask(task.id, e)}
                            className="h-4 w-4 rounded hover:bg-green-100 dark:hover:bg-green-900 flex items-center justify-center"
                            title="Complete"
                          >
                            <Check className="h-2.5 w-2.5 text-green-600" />
                          </button>
                          <button
                            onClick={(e) => handleSkipTask(task.id, e)}
                            className="h-4 w-4 rounded hover:bg-muted flex items-center justify-center"
                            title="Skip"
                          >
                            <SkipForward className="h-2.5 w-2.5 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Action card */}
      {currentTask && (
        <div className="border-t p-3 bg-primary/5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-medium text-primary">Next Action</span>
          </div>
          <p className="text-xs font-medium mb-0.5">{currentTask.name}</p>
          <p className="text-[10px] text-muted-foreground mb-2">{currentTask.description}</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-6 text-[10px] flex-1"
              onClick={() => onTaskClick?.(currentTask)}
            >
              Start this task
            </Button>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {currentTask.estimatedMinutes < 60
                ? `${currentTask.estimatedMinutes}min`
                : `${Math.round(currentTask.estimatedMinutes / 60)}h`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
