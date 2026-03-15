"use client";

import { EvidencePanel } from "@/components/evidence/evidence-panel";

interface CitationsViewProps {
  documentId: string;
  draftText: string;
  onCiteInsert: (sentenceIndex: number, citeCommand: string) => void;
}

export function CitationsView({ documentId, draftText, onCiteInsert }: CitationsViewProps) {
  return (
    <div className="flex-1 min-h-0">
      <EvidencePanel
        isOpen={true}
        onClose={() => {}}
        documentId={documentId}
        draftText={draftText}
        onCiteInsert={onCiteInsert}
        fullWidth
      />
    </div>
  );
}
