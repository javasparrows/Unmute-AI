"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  FileType,
  AlertTriangle,
  BookOpen,
  FileImage,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  citationCount: number;
  hasContent: boolean;
}

export function ExportDialog({
  open,
  onOpenChange,
  documentId,
  citationCount,
  hasContent,
}: ExportDialogProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (
    format: "latex" | "docx" | "bibtex" | "evidence-pptx",
  ) => {
    setDownloading(format);
    try {
      const endpoint =
        format === "bibtex"
          ? `/api/v2/evidence/bibtex?documentId=${documentId}`
          : format === "evidence-pptx"
            ? `/api/v2/export/evidence-pptx?documentId=${documentId}`
            : `/api/v2/export/${format}?documentId=${documentId}`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "latex"
          ? "manuscript.tex"
          : format === "docx"
            ? "manuscript.docx"
            : format === "evidence-pptx"
              ? "evidence_report.pptx"
              : "references.bib";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Handle error silently for now
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export
          </DialogTitle>
          <DialogDescription>
            Select a format to download your manuscript
          </DialogDescription>
        </DialogHeader>

        {/* Preflight warnings */}
        <div className="space-y-2">
          {!hasContent && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No text content in the manuscript
            </div>
          )}
          {hasContent && citationCount === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No citations have been added yet
            </div>
          )}
        </div>

        {/* Export options */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleExport("latex")}
            disabled={!hasContent || downloading !== null}
          >
            <FileText className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <div className="font-medium">LaTeX (.tex)</div>
              <div className="text-xs text-muted-foreground">
                For Overleaf or TeX editors. Includes \cite{"{"}key{"}"} commands
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleExport("docx")}
            disabled={!hasContent || downloading !== null}
          >
            <FileType className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <div className="font-medium">Word (.docx)</div>
              <div className="text-xs text-muted-foreground">
                Edit in Microsoft Word. Citations formatted as (Author, Year)
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleExport("bibtex")}
            disabled={citationCount === 0 || downloading !== null}
          >
            <BookOpen className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <div className="font-medium">BibTeX (.bib)</div>
              <div className="text-xs text-muted-foreground">
                Reference list. Use alongside LaTeX export
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => handleExport("evidence-pptx")}
            disabled={citationCount === 0 || downloading !== null}
          >
            <FileImage className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <div className="font-medium">Evidence Report (.pptx)</div>
              <div className="text-xs text-muted-foreground">
                Citation evidence mapped to source passages. For advisor review
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
