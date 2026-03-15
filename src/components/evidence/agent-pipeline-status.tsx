"use client";

import { useState, useEffect } from "react";
import {
  Check,
  Loader2,
  Brain,
  Search,
  ShieldCheck,
  FileText,
  Sparkles,
  Database,
  Zap,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PipelineStep {
  id: string;
  label: string;
  detail?: string;
  icon: "brain" | "search" | "shield" | "file" | "sparkles" | "database" | "zap";
  status: "waiting" | "running" | "done" | "error";
  startedAt?: number;
  completedAt?: number;
}

interface AgentPipelineStatusProps {
  steps: PipelineStep[];
  title?: string;
  compact?: boolean;
}

const ICONS = {
  brain: Brain,
  search: Search,
  shield: ShieldCheck,
  file: FileText,
  sparkles: Sparkles,
  database: Database,
  zap: Zap,
};

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
      <Clock className="h-2.5 w-2.5" />
      {(elapsed / 1000).toFixed(1)}s
    </span>
  );
}

export function AgentPipelineStatus({
  steps,
  title,
  compact,
}: AgentPipelineStatusProps) {
  return (
    <div className={cn("space-y-1", compact ? "p-2" : "p-4")}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <Zap className="h-4 w-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full animate-ping" />
          </div>
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            {title}
          </span>
        </div>
      )}
      <div className="space-y-0.5">
        {steps.map((step, i) => {
          const Icon = ICONS[step.icon];
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className="flex items-start gap-2.5">
              {/* Icon + connector line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full shrink-0 transition-all duration-300",
                    compact ? "h-6 w-6" : "h-7 w-7",
                    step.status === "done" &&
                      "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400",
                    step.status === "running" &&
                      "bg-primary/10 text-primary animate-pulse",
                    step.status === "waiting" &&
                      "bg-muted text-muted-foreground",
                    step.status === "error" &&
                      "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
                  )}
                >
                  {step.status === "done" ? (
                    <Check
                      className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")}
                    />
                  ) : step.status === "running" ? (
                    <Loader2
                      className={cn(
                        "animate-spin",
                        compact ? "h-3 w-3" : "h-3.5 w-3.5",
                      )}
                    />
                  ) : (
                    <Icon
                      className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")}
                    />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-px flex-1 min-h-[8px]",
                      step.status === "done"
                        ? "bg-green-300 dark:bg-green-800"
                        : "bg-border",
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn("pb-2 min-w-0", compact ? "pt-0.5" : "pt-1")}>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-medium truncate",
                      compact ? "text-[11px]" : "text-xs",
                      step.status === "running" && "text-primary",
                      step.status === "done" && "text-muted-foreground",
                      step.status === "waiting" && "text-muted-foreground/60",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.status === "running" && step.startedAt && (
                    <ElapsedTimer startedAt={step.startedAt} />
                  )}
                  {step.status === "done" &&
                    step.startedAt &&
                    step.completedAt && (
                      <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {(
                          (step.completedAt - step.startedAt) /
                          1000
                        ).toFixed(1)}
                        s
                      </span>
                    )}
                </div>
                {step.detail && step.status === "running" && (
                  <p
                    className={cn(
                      "text-muted-foreground mt-0.5 truncate",
                      compact ? "text-[10px]" : "text-[11px]",
                    )}
                  >
                    {step.detail}
                  </p>
                )}
                {step.detail && step.status === "done" && (
                  <p
                    className={cn(
                      "text-muted-foreground/60 mt-0.5 truncate",
                      compact ? "text-[10px]" : "text-[11px]",
                    )}
                  >
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
