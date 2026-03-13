"use client";

import { useState, useTransition } from "react";
import { History, RotateCcw } from "lucide-react";
import { getVersions, getVersion } from "@/app/actions/version";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VersionSummary {
  id: string;
  versionNumber: number;
  createdAt: Date;
  sourceLang: string;
  targetLang: string;
}

interface VersionData {
  versionNumber: number;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  journal: string | null;
  provider: string | null;
  leftRanges: { from: number; to: number }[] | null;
  rightRanges: { from: number; to: number }[] | null;
  sentenceAlignments: { left: number[]; right: number[] }[] | null;
}

interface VersionPanelProps {
  documentId: string;
  currentVersionNumber: number;
  onRestore: (version: VersionData) => void;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function VersionPanel({
  documentId,
  currentVersionNumber,
  onRestore,
}: VersionPanelProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      startTransition(async () => {
        const data = await getVersions(documentId);
        setVersions(data);
      });
    }
  };

  const handleRestore = (versionNumber: number) => {
    startTransition(async () => {
      const version = await getVersion(documentId, versionNumber);
      if (version) {
        onRestore({
          versionNumber: version.versionNumber,
          sourceText: version.sourceText,
          translatedText: version.translatedText,
          sourceLang: version.sourceLang,
          targetLang: version.targetLang,
          journal: version.journal,
          provider: version.provider,
          leftRanges: version.leftRanges as { from: number; to: number }[] | null,
          rightRanges: version.rightRanges as { from: number; to: number }[] | null,
          sentenceAlignments: (version as Record<string, unknown>).sentenceAlignments as { left: number[]; right: number[] }[] | null,
        });
        setIsOpen(false);
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <History className="h-4 w-4" />
              v{currentVersionNumber}
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>バージョン履歴</TooltipContent>
      </Tooltip>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>バージョン履歴</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {versions.map((v) => (
            <div
              key={v.id}
              className={`flex items-center justify-between rounded-md px-3 py-2 ${
                v.versionNumber === currentVersionNumber
                  ? "bg-accent"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    v.versionNumber === currentVersionNumber
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  }`}
                />
                <div>
                  <span className="text-sm font-medium">
                    v{v.versionNumber}
                  </span>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {formatDate(v.createdAt)}
                  </span>
                </div>
              </div>
              {v.versionNumber === currentVersionNumber ? (
                <span className="text-xs text-muted-foreground">現在</span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestore(v.versionNumber)}
                  disabled={isPending}
                  className="h-7 gap-1 text-xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  復元
                </Button>
              )}
            </div>
          ))}
          {versions.length === 0 && !isPending && (
            <p className="text-sm text-muted-foreground text-center py-4">
              バージョンがありません
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
