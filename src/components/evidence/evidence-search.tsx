"use client";

import { useState, useRef, useTransition } from "react";
import { Search, Loader2, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaperCard } from "./paper-card";
import { PaperCardSkeleton } from "./paper-card-skeleton";
import type { PaperCandidate, SectionType } from "@/types/evidence";

const SEARCH_EXAMPLES = [
  {
    category: "Research topic",
    query: "deep learning for medical image segmentation",
    description: "Search by research topic or theme",
  },
  {
    category: "Research question",
    query: "What methods improve transformer efficiency for long sequences?",
    description: "Ask a research question in natural language",
  },
  {
    category: "Keywords",
    query: "CRISPR gene editing efficiency in vivo delivery",
    description: "Combine multiple keywords",
  },
  {
    category: "Japanese",
    query: "大規模言語モデルの幻覚問題と対策手法",
    description: "Japanese queries are automatically translated",
  },
  {
    category: "Specific finding",
    query: "attention mechanism outperforms recurrent networks for machine translation",
    description: "Search for papers supporting a specific claim",
  },
];

interface EvidenceSearchProps {
  documentId: string;
}

export function EvidenceSearch({ documentId }: EvidenceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaperCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [, startTransition] = useTransition();
  const isComposingRef = useRef(false);

  async function handleSearch() {
    if (!query.trim() || isSearching) return;
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // IME 変換中は Enter で検索しない
    if (isComposingRef.current) return;
    // Shift+Enter で改行、Enter のみで検索
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  }

  return (
    <div className="p-4 space-y-3">
      {/* Search Input */}
      <div className="space-y-2">
        <textarea
          placeholder="研究トピックやキーワードを入力...&#10;例: 深層学習を用いた医用画像セグメンテーション"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          className="w-full gap-2"
          size="sm"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search Papers
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          日本語・英語どちらでも検索できます
        </p>
      </div>

      {/* Status */}
      {(isSearching || searchStatus) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{searchStatus}</span>
        </div>
      )}

      {/* Search Guide (shown when no query and no results) */}
      {!query.trim() && results.length === 0 && !isSearching && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span>How to search</span>
          </div>
          <div className="space-y-2">
            {SEARCH_EXAMPLES.map((example) => (
              <button
                key={example.category}
                onClick={() => setQuery(example.query)}
                className="w-full text-left p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">{example.category}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-foreground/90 mt-0.5 leading-snug">{example.query}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{example.description}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center pt-1">
            Click an example to use it, or type your own query
          </p>
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
