"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { citationStore } from "@/lib/citation-store";

interface EvidenceLibraryProps {
  documentId: string;
}

interface CitationEntry {
  id: string;
  citeKey: string | null;
  paper: {
    id: string;
    title: string;
    year: number | null;
    venue: string | null;
    citationCount: number;
  };
}

export function EvidenceLibrary({ documentId }: EvidenceLibraryProps) {
  const [loading, setLoading] = useState(true);
  const [citations, setCitations] = useState<CitationEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const fetchCitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/evidence/library?documentId=${encodeURIComponent(documentId)}`
      );
      if (res.ok) {
        const data = await res.json();
        const loadedCitations: CitationEntry[] = data.citations ?? [];
        setCitations(loadedCitations);

        // Populate citation store for tooltip metadata
        for (const citation of loadedCitations) {
          if (citation.citeKey) {
            citationStore.set(citation.citeKey, {
              citeKey: citation.citeKey,
              paperId: citation.paper.id,
              title: citation.paper.title,
              authors: [],
              year: citation.paper.year ?? undefined,
              venue: citation.paper.venue ?? undefined,
            });
          }
        }
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchCitations();
  }, [fetchCitations]);

  async function handleExportBibtex() {
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/evidence/bibtex?documentId=${encodeURIComponent(documentId)}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "references.bib";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Handle error silently
    } finally {
      setIsExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (citations.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No citations yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Search for papers and add them to your library
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {citations.length} citation{citations.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          onClick={handleExportBibtex}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          Export BibTeX
        </Button>
      </div>

      {citations.map((citation) => (
        <Card key={citation.id} className="border shadow-none">
          <CardHeader className="p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
                {citation.paper.title}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            </div>

            <CardDescription className="text-xs">
              {citation.paper.year && `(${citation.paper.year})`}
              {citation.paper.venue && ` - ${citation.paper.venue}`}
            </CardDescription>

            <div className="flex items-center gap-2 flex-wrap">
              {citation.citeKey && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {citation.citeKey}
                </Badge>
              )}
              {citation.paper.citationCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {citation.paper.citationCount} citations
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
