"use client";

import { cn } from "@/lib/utils";
import { PenLine, BookOpen, ShieldCheck } from "lucide-react";

export type WorkflowTab = "write" | "citations" | "review";

interface WorkflowTabsProps {
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
  citationCount?: number;
  reviewCount?: number;
}

const tabs: { id: WorkflowTab; label: string; icon: typeof PenLine }[] = [
  { id: "write", label: "Write", icon: PenLine },
  { id: "citations", label: "Citations", icon: BookOpen },
  { id: "review", label: "Review", icon: ShieldCheck },
];

export function WorkflowTabs({ activeTab, onTabChange, citationCount, reviewCount }: WorkflowTabsProps) {
  return (
    <div className="flex border-b px-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const count = tab.id === "citations" ? citationCount : tab.id === "review" ? reviewCount : undefined;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {count !== undefined && count > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
