"use client";

import { useState, useEffect } from "react";
import { BookOpen, Loader2 } from "lucide-react";

interface EvidenceLibraryProps {
  documentId: string;
}

export function EvidenceLibrary({ documentId }: EvidenceLibraryProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch document's citations from API
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
