"use client";

import { useTransition, useState, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FileText, Trash2, Pencil, Check, X } from "lucide-react";
import { deleteDocument, renameDocument } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DocumentItem {
  id: string;
  title: string;
  updatedAt: Date;
  versions: { versionNumber: number; sourceLang: string; targetLang: string; journal: string | null }[];
  _count: { manuscriptCitations: number };
  journey: {
    currentPhase: number;
    currentTask: string;
    taskStatuses: unknown;
  } | null;
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

function DocumentCard({
  doc,
  onDelete,
}: {
  doc: DocumentItem;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("dashboard");
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(doc.title);
  const [editTitle, setEditTitle] = useState(doc.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestVersion = doc.versions[0];
  const versionNumber = latestVersion?.versionNumber ?? 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("confirmDelete"))) return;
    onDelete(doc.id);
    startTransition(() => deleteDocument(doc.id));
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTitle(displayTitle);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== displayTitle) {
      setDisplayTitle(trimmed);
      startTransition(() => renameDocument(doc.id, trimmed));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(displayTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm ring-2 ring-primary/20">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-primary/40 pb-0.5"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 ms-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("save")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCancel();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("cancel")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/documents/${doc.id}`}
      className="group flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="font-medium truncate">
            {displayTitle}
            {versionNumber > 0 && (
              <span className="ms-2 text-xs text-muted-foreground">
                (v{versionNumber})
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("updated")} {formatDate(doc.updatedAt)}
          </p>
          {latestVersion && (
            <div className="flex items-center gap-2 mt-1">
              {latestVersion.journal && (
                <Badge variant="outline" className="text-xs">
                  {latestVersion.journal}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {latestVersion.sourceLang} → {latestVersion.targetLang}
              </span>
              {doc._count.manuscriptCitations > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {doc._count.manuscriptCitations} 引用
                </Badge>
              )}
              {doc.journey && (
                <Badge variant="outline" className="text-xs">
                  Phase {doc.journey.currentPhase}: タスク {doc.journey.currentTask}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleStartEdit}
              disabled={isPending}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("rename")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("delete")}</TooltipContent>
        </Tooltip>
      </div>
    </Link>
  );
}

export function DocumentList({ documents }: DocumentListProps) {
  const t = useTranslations("dashboard");
  const [visibleDocs, setVisibleDocs] = useState(documents);

  const handleDelete = (id: string) => {
    setVisibleDocs((prev) => prev.filter((doc) => doc.id !== id));
  };

  if (visibleDocs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          {t("noDocuments")}
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {t("noDocumentsHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visibleDocs.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
      ))}
    </div>
  );
}
