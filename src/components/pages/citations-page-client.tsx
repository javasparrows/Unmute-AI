"use client";

import { useCallback } from "react";
import { ArrowLeftIcon, BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CitationsView } from "@/components/editor/citations-view";

interface CitationsPageClientProps {
  documentId: string;
  documentTitle: string;
  draftText: string;
}

export function CitationsPageClient({
  documentId,
  documentTitle,
  draftText,
}: CitationsPageClientProps) {
  const handleCiteInsert = useCallback(
    (_sentenceIndex: number, _citeCommand: string) => {
      // In standalone page, cite insert is a no-op (editor is not open).
      // Users should use the editor for inserting citations into the draft.
    },
    [],
  );

  return (
    <>
      <div className="border-b px-6 py-3 flex items-center gap-3">
        <Link href={`/papers/${documentId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
        <BookOpen className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-sm font-semibold">{documentTitle}</h1>
          <p className="text-xs text-muted-foreground">Citations & Evidence</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <CitationsView
          documentId={documentId}
          draftText={draftText}
          onCiteInsert={handleCiteInsert}
        />
      </div>
    </>
  );
}
