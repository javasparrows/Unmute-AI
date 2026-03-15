"use client";

import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { EvidencePanel } from "@/components/evidence/evidence-panel";
import { EvidenceMappingPanel } from "@/components/evidence/evidence-mapping-panel";
import { cn } from "@/lib/utils";

interface CitationsViewProps {
  documentId: string;
  draftText: string;
  onCiteInsert: (sentenceIndex: number, citeCommand: string) => void;
}

type CitationsSubTab = "search" | "mapping";

export function CitationsView({ documentId, draftText, onCiteInsert }: CitationsViewProps) {
  const [subTab, setSubTab] = useState<CitationsSubTab>("search");

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Sub-tabs */}
      <div className="flex border-b px-4">
        <button
          onClick={() => setSubTab("search")}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            subTab === "search"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Search className="h-3.5 w-3.5" />
          Search & Library
        </button>
        <button
          onClick={() => setSubTab("mapping")}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            subTab === "mapping"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <MapPin className="h-3.5 w-3.5" />
          Evidence Map
        </button>
      </div>

      {/* Content */}
      {subTab === "search" && (
        <EvidencePanel
          isOpen={true}
          onClose={() => {}}
          documentId={documentId}
          draftText={draftText}
          onCiteInsert={onCiteInsert}
          fullWidth
        />
      )}

      {subTab === "mapping" && (
        <EvidenceMappingPanel documentId={documentId} draftText={draftText} />
      )}
    </div>
  );
}
