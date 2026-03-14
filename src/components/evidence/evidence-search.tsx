"use client";

import { useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PaperCard } from "./paper-card";
import { PaperCardSkeleton } from "./paper-card-skeleton";
import type { PaperCandidate, SectionType } from "@/types/evidence";

interface EvidenceSearchProps {
  documentId: string;
}

export function EvidenceSearch({ documentId }: EvidenceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaperCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [, startTransition] = useTransition();

  async function handleSearch() {
    if (!query.trim()) return;
    setIsSearching(true);
    setResults([]);
    setSearchStatus("Expanding query...");

    try {
      const res = await fetch("/api/evidence/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          query: query.trim(),
          section: "INTRODUCTION" as SectionType,
        }),
      });

      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      setSearchStatus(`Found ${data.candidates.length} papers`);
      startTransition(() => {
        setResults(data.candidates);
      });
    } catch {
      setSearchStatus("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search papers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-9"
        />
      </div>

      {/* Status */}
      {(isSearching || searchStatus) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{searchStatus}</span>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {isSearching && results.length === 0 && (
          <>
            <PaperCardSkeleton />
            <PaperCardSkeleton />
            <PaperCardSkeleton />
          </>
        )}
        {results.map((paper, i) => (
          <PaperCard
            key={`${paper.externalIds.doi || paper.title}-${i}`}
            paper={paper}
            documentId={documentId}
          />
        ))}
      </div>
    </div>
  );
}
