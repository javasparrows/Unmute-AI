"use client";

import { useTransition } from "react";
import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import { deleteDocument } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DocumentItem {
  id: string;
  title: string;
  updatedAt: Date;
  versions: { versionNumber: number }[];
}

interface DocumentListProps {
  documents: DocumentItem[];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function DocumentCard({ doc }: { doc: DocumentItem }) {
  const [isPending, startTransition] = useTransition();
  const latestVersion = doc.versions[0]?.versionNumber ?? 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("このドキュメントを削除しますか？")) return;
    startTransition(() => deleteDocument(doc.id));
  };

  return (
    <Link
      href={`/documents/${doc.id}`}
      className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="font-medium truncate">
            {doc.title}
            {latestVersion > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                (v{latestVersion})
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            更新: {formatDate(doc.updatedAt)}
          </p>
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>削除</TooltipContent>
      </Tooltip>
    </Link>
  );
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          まだドキュメントがありません
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          「新規作成」をクリックして翻訳を始めましょう
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} />
      ))}
    </div>
  );
}
