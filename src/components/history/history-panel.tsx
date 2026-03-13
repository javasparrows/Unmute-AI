"use client";

import { useSyncExternalStore } from "react";
import type { HistoryEntry, LanguageCode } from "@/types";
import { historyStore } from "@/lib/history-store";
import { HistoryEntryComponent } from "./history-entry";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistoryPanelProps {
  onRestore: (entry: {
    sourceText: string;
    translatedText: string;
    sourceLang: LanguageCode;
    targetLang: LanguageCode;
    journal?: string;
  }) => void;
  onSave: () => void;
}

export function HistoryPanel({ onRestore, onSave }: HistoryPanelProps) {
  const entries = useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot,
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          履歴
          {entries.length > 0 && (
            <span className="ms-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              {entries.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>翻訳履歴</SheetTitle>
          <SheetDescription>
            過去の翻訳を復元できます。最大50件保存されます。
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={onSave}>
            現在の内容を保存
          </Button>
          {entries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => historyStore.clearAll()}
              className="text-destructive hover:text-destructive"
            >
              すべて削除
            </Button>
          )}
        </div>
        <ScrollArea className="mt-4 h-[calc(100vh-200px)]">
          <div className="space-y-3 pe-4">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                履歴はまだありません
              </p>
            ) : (
              entries.map((entry: HistoryEntry) => (
                <HistoryEntryComponent
                  key={entry.id}
                  entry={entry}
                  onRestore={() => onRestore(entry)}
                  onDelete={() => historyStore.removeEntry(entry.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
