"use client";

import type { HistoryEntry as HistoryEntryType } from "@/types";
import { getLanguageLabel } from "@/lib/languages";
import { Button } from "@/components/ui/button";

interface HistoryEntryProps {
  entry: HistoryEntryType;
  onRestore: () => void;
  onDelete: () => void;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryEntryComponent({ entry, onRestore, onDelete }: HistoryEntryProps) {
  const preview = entry.sourceText.slice(0, 80).replace(/\n/g, " ");

  return (
    <div className="group flex flex-col gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatTimestamp(entry.timestamp)}
        </span>
        <span className="text-xs text-muted-foreground">
          {getLanguageLabel(entry.sourceLang)} → {getLanguageLabel(entry.targetLang)}
        </span>
      </div>
      <p className="text-sm text-foreground/80 line-clamp-2">{preview || "(空)"}</p>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="outline" size="sm" onClick={onRestore} className="h-7 text-xs">
          復元
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 text-xs text-destructive hover:text-destructive"
        >
          削除
        </Button>
      </div>
    </div>
  );
}
