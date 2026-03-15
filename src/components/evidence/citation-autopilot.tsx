"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocale } from "next-intl";
import {
  Play,
  Loader2,
  SkipForward,
  X,
  Check,
  ChevronRight,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PaperCandidate, SectionType } from "@/types/evidence";
import { AgentPipelineStatus, type PipelineStep } from "./agent-pipeline-status";
import { citationStore } from "@/lib/citation-store";

interface AnalyzedSentence {
  index: number;
  text: string;
  status: "NEEDS_CITATION" | "NO_CITATION" | "ALREADY_CITED";
  reason?: string;
}

interface AcceptedCitation {
  sentenceIndex: number;
  citeKey: string;
  paperTitle: string;
  bibtex: string;
}

interface CitationAutopilotProps {
  documentId: string;
  draftText: string;
  section: SectionType;
  onCiteInsert?: (sentenceIndex: number, citeCommand: string) => void;
  onComplete?: (citations: AcceptedCitation[], bibtex: string) => void;
}

type Phase = "idle" | "analyzing" | "reviewing" | "suggesting" | "complete";

export function CitationAutopilot({
  documentId,
  draftText,
  section,
  onCiteInsert,
  onComplete,
}: CitationAutopilotProps) {
  const locale = useLocale();
  const [phase, setPhase] = useState<Phase>("idle");
  const [sentences, setSentences] = useState<AnalyzedSentence[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [needsCitationSentences, setNeedsCitationSentences] = useState<
    AnalyzedSentence[]
  >([]);
  const [candidates, setCandidates] = useState<PaperCandidate[]>([]);
  const [, setSearchQuery] = useState("");
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [acceptedCitations, setAcceptedCitations] = useState<
    AcceptedCitation[]
  >([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [acceptingIndex, setAcceptingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);

  // Prefetch cache
  const prefetchCache = useRef<
    Map<
      number,
      Promise<{ candidates: PaperCandidate[]; searchQuery: string }>
    >
  >(new Map());

  const labels = getLabels(locale);

  // Raw fetch for suggestions (used by both fetch and prefetch)
  const fetchSuggestionsRaw = useCallback(
    async (
      sentenceText: string,
    ): Promise<{ candidates: PaperCandidate[]; searchQuery: string }> => {
      const res = await fetch("/api/evidence/autopilot/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: sentenceText, section }),
      });
      if (!res.ok) throw new Error("Suggestion failed");
      return res.json();
    },
    [section],
  );

  // Prefetch suggestions for a sentence
  const prefetchSuggestions = useCallback(
    (sentence: AnalyzedSentence) => {
      if (prefetchCache.current.has(sentence.index)) return;
      prefetchCache.current.set(
        sentence.index,
        fetchSuggestionsRaw(sentence.text),
      );
    },
    [fetchSuggestionsRaw],
  );

  // Fetch suggestions for a sentence (uses prefetch cache if available)
  const fetchSuggestions = useCallback(
    async (sentence: AnalyzedSentence) => {
      setIsLoadingCandidates(true);
      setCandidates([]);
      setSearchQuery("");

      // Show search pipeline
      setPipelineSteps([
        { id: "query", label: labels.pipelineQuery, icon: "brain", status: "running", startedAt: Date.now() },
        { id: "search", label: labels.pipelineSearch, icon: "search", status: "waiting" },
        { id: "rank", label: labels.pipelineRank, icon: "sparkles", status: "waiting" },
      ]);

      // Check prefetch cache
      const cached = prefetchCache.current.get(sentence.index);
      if (cached) {
        try {
          const result = await cached;
          setCandidates(result.candidates);
          setSearchQuery(result.searchQuery);
          setPipelineSteps(prev => prev.map(s => ({ ...s, status: "done" as const, completedAt: Date.now() })));
          setIsLoadingCandidates(false);
          return;
        } catch {
          // Cache miss, fetch normally
        }
      }

      try {
        // Update pipeline as we go
        setTimeout(() => {
          setPipelineSteps(prev => prev.map(s =>
            s.id === "query" ? { ...s, status: "done" as const, completedAt: Date.now() } :
            s.id === "search" ? { ...s, status: "running" as const, startedAt: Date.now(), detail: "OpenAlex / Crossref / PubMed" } :
            s
          ));
        }, 600);

        const result = await fetchSuggestionsRaw(sentence.text);

        setPipelineSteps(prev => prev.map(s =>
          s.id === "search" ? { ...s, status: "done" as const, completedAt: Date.now(), detail: `${result.candidates.length} papers` } :
          s.id === "rank" ? { ...s, status: "running" as const, startedAt: Date.now() } :
          s
        ));

        await new Promise(r => setTimeout(r, 300));
        setPipelineSteps(prev => prev.map(s =>
          s.id === "rank" ? { ...s, status: "done" as const, completedAt: Date.now() } : s
        ));

        setCandidates(result.candidates);
        setSearchQuery(result.searchQuery);
      } catch {
        setError(labels.suggestionFailed);
      } finally {
        setIsLoadingCandidates(false);
      }
    },
    [fetchSuggestionsRaw, labels.suggestionFailed, labels.pipelineQuery, labels.pipelineSearch, labels.pipelineRank],
  );

  // Start analysis
  const startAutopilot = useCallback(async () => {
    if (!draftText.trim()) {
      setError(labels.noText);
      return;
    }
    setPhase("analyzing");
    setError(null);
    setAcceptedCitations([]);
    setSkippedCount(0);

    // Pipeline steps for analysis
    const analysisSteps: PipelineStep[] = [
      { id: "split", label: labels.pipelineSplit, icon: "file", status: "running", startedAt: Date.now() },
      { id: "classify", label: labels.pipelineClassify, icon: "brain", status: "waiting" },
      { id: "prepare", label: labels.pipelinePrepare, icon: "sparkles", status: "waiting" },
    ];
    setPipelineSteps(analysisSteps);

    try {
      // Step 1 -> 2: Simulate progression (actual LLM call handles all at once)
      setTimeout(() => {
        setPipelineSteps(prev => prev.map(s =>
          s.id === "split" ? { ...s, status: "done" as const, completedAt: Date.now() } :
          s.id === "classify" ? { ...s, status: "running" as const, startedAt: Date.now(), detail: labels.pipelineClassifyDetail } :
          s
        ));
      }, 800);

      const res = await fetch("/api/evidence/autopilot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draftText, section }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();

      // Mark classify done, prepare running
      setPipelineSteps(prev => prev.map(s =>
        s.id === "classify" ? { ...s, status: "done" as const, completedAt: Date.now(), detail: `${data.needsCitation} ${labels.pipelineFound}` } :
        s.id === "prepare" ? { ...s, status: "running" as const, startedAt: Date.now() } :
        s
      ));

      setSentences(data.sentences);
      const needsCitation = data.sentences.filter(
        (s: AnalyzedSentence) => s.status === "NEEDS_CITATION",
      );
      setNeedsCitationSentences(needsCitation);

      // Small delay to show "prepare" step
      await new Promise(r => setTimeout(r, 500));
      setPipelineSteps(prev => prev.map(s =>
        s.id === "prepare" ? { ...s, status: "done" as const, completedAt: Date.now() } : s
      ));

      if (needsCitation.length === 0) {
        setPhase("complete");
        return;
      }

      setCurrentIdx(0);
      setPhase("reviewing");
      // Fetch suggestions for first sentence
      await fetchSuggestions(needsCitation[0]);
      // Prefetch second
      if (needsCitation.length > 1) prefetchSuggestions(needsCitation[1]);
    } catch {
      setError(labels.analysisFailed);
      setPhase("idle");
    }
  }, [
    draftText,
    section,
    labels.noText,
    labels.analysisFailed,
    labels.pipelineSplit,
    labels.pipelineClassify,
    labels.pipelineClassifyDetail,
    labels.pipelinePrepare,
    labels.pipelineFound,
    fetchSuggestions,
    prefetchSuggestions,
  ]);

  // Advance to next sentence
  const advanceToNext = useCallback(() => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= needsCitationSentences.length) {
      setPhase("complete");
      return;
    }
    setCurrentIdx(nextIdx);
    fetchSuggestions(needsCitationSentences[nextIdx]);
    // Prefetch next+1
    if (nextIdx + 1 < needsCitationSentences.length) {
      prefetchSuggestions(needsCitationSentences[nextIdx + 1]);
    }
  }, [
    currentIdx,
    needsCitationSentences,
    fetchSuggestions,
    prefetchSuggestions,
  ]);

  // Accept a candidate paper
  const handleAccept = useCallback(
    async (candidate: PaperCandidate, candidateIndex: number) => {
      setAcceptingIndex(candidateIndex);
      try {
        const res = await fetch("/api/evidence/autopilot/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            candidate,
            sentenceIndex: needsCitationSentences[currentIdx].index,
            sectionType: section,
            action: "ACCEPT",
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Accept failed");
          setAcceptingIndex(null);
          return;
        }

        const data = await res.json();
        const citation: AcceptedCitation = {
          sentenceIndex: data.sentenceIndex,
          citeKey: data.citeKey,
          paperTitle: data.paperTitle,
          bibtex: data.bibtex,
        };

        const currentCandidate = candidate;
        citationStore.set(data.citeKey, {
          citeKey: data.citeKey,
          paperId: data.paperId,
          title: data.paperTitle,
          authors: currentCandidate.authors ?? [],
          year: currentCandidate.year,
          venue: currentCandidate.venue,
        });

        setAcceptedCitations((prev) => [...prev, citation]);
        onCiteInsert?.(data.sentenceIndex, data.citeCommand);

        advanceToNext();
      } catch {
        setError(labels.acceptFailed);
      } finally {
        setAcceptingIndex(null);
      }
    },
    [
      documentId,
      needsCitationSentences,
      currentIdx,
      section,
      onCiteInsert,
      advanceToNext,
      labels.acceptFailed,
    ],
  );

  // Skip current sentence
  const handleSkip = useCallback(() => {
    setSkippedCount((prev) => prev + 1);
    advanceToNext();
  }, [advanceToNext]);

  // Exit review early
  const handleExit = useCallback(() => {
    setPhase("complete");
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== "reviewing") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === " " && !e.shiftKey) {
        e.preventDefault();
        handleSkip();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleExit();
      }
      // 1-5 to accept by number
      const num = parseInt(e.key);
      if (num >= 1 && num <= candidates.length) {
        e.preventDefault();
        handleAccept(candidates[num - 1], num - 1);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [phase, candidates, handleSkip, handleExit, handleAccept]);

  // Complete callback
  useEffect(() => {
    if (phase === "complete" && acceptedCitations.length > 0) {
      const allBibtex = acceptedCitations.map((c) => c.bibtex).join("\n\n");
      onComplete?.(acceptedCitations, allBibtex);
    }
  }, [phase, acceptedCitations, onComplete]);

  const currentSentence = needsCitationSentences[currentIdx];
  const progress =
    needsCitationSentences.length > 0
      ? ((currentIdx + (phase === "complete" ? 1 : 0)) /
          needsCitationSentences.length) *
        100
      : 0;

  // -- IDLE --
  if (phase === "idle") {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center space-y-3">
          <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto" />
          <div>
            <p className="text-sm font-medium">{labels.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {labels.description}
            </p>
          </div>
          <Button
            onClick={startAutopilot}
            className="w-full gap-2"
            disabled={!draftText.trim()}
          >
            <Play className="h-4 w-4" />
            {labels.start}
          </Button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground">{labels.shortcuts}</p>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                1-5
              </kbd>{" "}
              {labels.shortcutAccept}
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                Space
              </kbd>{" "}
              {labels.shortcutSkip}
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                Esc
              </kbd>{" "}
              {labels.shortcutExit}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- ANALYZING --
  if (phase === "analyzing") {
    return (
      <AgentPipelineStatus
        steps={pipelineSteps}
        title={labels.analyzing}
      />
    );
  }

  // -- COMPLETE --
  if (phase === "complete") {
    const alreadyCited = sentences.filter(
      (s) => s.status === "ALREADY_CITED",
    ).length;
    return (
      <div className="p-4 space-y-4">
        <div className="text-center space-y-2">
          <Check className="h-10 w-10 text-green-600 mx-auto" />
          <p className="text-sm font-medium">{labels.complete}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2">
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              {acceptedCitations.length}
            </p>
            <p className="text-[10px] text-green-600 dark:text-green-400">
              {labels.cited}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-2">
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {skippedCount}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              {labels.skipped}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2">
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {alreadyCited}
            </p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">
              {labels.alreadyCited}
            </p>
          </div>
        </div>
        {acceptedCitations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {labels.addedCitations}
            </p>
            {acceptedCitations.map((c) => (
              <div key={c.citeKey} className="text-xs p-2 bg-muted rounded-lg">
                <span className="font-mono text-primary">
                  \cite{`{${c.citeKey}}`}
                </span>
                <span className="text-muted-foreground ml-2">
                  {c.paperTitle}
                </span>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const allBibtex = acceptedCitations
                  .map((c) => c.bibtex)
                  .join("\n\n");
                navigator.clipboard.writeText(allBibtex);
              }}
            >
              {labels.copyBibtex}
            </Button>
          </div>
        )}
        <Button
          variant="outline"
          onClick={() => setPhase("idle")}
          className="w-full text-xs"
        >
          {labels.restart}
        </Button>
      </div>
    );
  }

  // -- REVIEWING (main flow) --
  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-3 pb-2 border-b space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {labels.sentence} {currentIdx + 1}/{needsCitationSentences.length}
          </span>
          <span>
            {acceptedCitations.length} {labels.cited} · {skippedCount}{" "}
            {labels.skipped}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary rounded-full h-1.5 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current sentence */}
      <div className="px-4 py-3 bg-primary/5 border-b">
        <p className="text-sm leading-relaxed font-medium">
          {currentSentence?.text}
        </p>
        {currentSentence?.reason && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            {currentSentence.reason}
          </p>
        )}
      </div>

      {/* Candidates */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoadingCandidates ? (
          <AgentPipelineStatus steps={pipelineSteps} compact />
        ) : candidates.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {labels.noCandidates}
            </p>
          </div>
        ) : (
          candidates.map((paper, i) => (
            <button
              key={`${paper.externalIds?.doi || paper.title}-${i}`}
              onClick={() => handleAccept(paper, i)}
              disabled={acceptingIndex !== null}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors group disabled:opacity-50"
            >
              <div className="flex items-start gap-2">
                <kbd className="shrink-0 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono mt-0.5">
                  {i + 1}
                </kbd>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {acceptingIndex === i && (
                      <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                    )}
                    {paper.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {paper.authors
                      ?.slice(0, 2)
                      .map((a) => a.name)
                      .join(", ")}
                    {(paper.authors?.length ?? 0) > 2 ? " et al." : ""}
                    {paper.year ? ` (${paper.year})` : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {paper.citationCount != null && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1.5"
                      >
                        {paper.citationCount} cit.
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5"
                    >
                      {paper.source}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-4 py-3 border-t flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkip}
          className="flex-1 gap-1.5 text-xs"
        >
          <SkipForward className="h-3.5 w-3.5" />
          {labels.skip}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExit} className="text-xs">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}

// Localization helper
function getLabels(locale: string): Record<string, string> {
  const labels: Record<string, Record<string, string>> = {
    ja: {
      title: "Citation Auto-Pilot",
      description:
        "文ごとに引用候補を提案します。クリックするだけで引用を挿入できます。",
      start: "引用チェックを開始",
      analyzing: "文を分析中...",
      searching: "論文を検索中...",
      complete: "引用チェック完了",
      cited: "引用追加",
      skipped: "スキップ",
      alreadyCited: "引用済み",
      skip: "スキップ",
      sentence: "文",
      addedCitations: "追加された引用",
      copyBibtex: "BibTeX をコピー",
      restart: "もう一度実行",
      shortcuts: "キーボードショートカット",
      shortcutAccept: "候補を選択",
      shortcutSkip: "スキップ",
      shortcutExit: "終了",
      noCandidates: "候補が見つかりませんでした",
      noText: "テキストを入力してから開始してください",
      analysisFailed: "分析に失敗しました",
      suggestionFailed: "候補の取得に失敗しました",
      acceptFailed: "引用の追加に失敗しました",
      pipelineSplit: "テキストを文に分割",
      pipelineClassify: "引用の必要性を判定",
      pipelineClassifyDetail: "各文をAIが分析中...",
      pipelinePrepare: "引用チェックを準備",
      pipelineFound: "文が引用を必要としています",
      pipelineQuery: "検索クエリを生成",
      pipelineSearch: "論文データベースを検索",
      pipelineRank: "関連度でランキング",
    },
    en: {
      title: "Citation Auto-Pilot",
      description:
        "Walk through your text sentence by sentence. Click to cite, Space to skip.",
      start: "Start Citation Check",
      analyzing: "Analyzing sentences...",
      searching: "Searching papers...",
      complete: "Citation check complete",
      cited: "cited",
      skipped: "skipped",
      alreadyCited: "already cited",
      skip: "Skip",
      sentence: "Sentence",
      addedCitations: "Added citations",
      copyBibtex: "Copy BibTeX",
      restart: "Run again",
      shortcuts: "Keyboard shortcuts",
      shortcutAccept: "Accept paper",
      shortcutSkip: "Skip sentence",
      shortcutExit: "Exit",
      noCandidates: "No candidates found",
      noText: "Enter text before starting",
      analysisFailed: "Analysis failed",
      suggestionFailed: "Failed to fetch suggestions",
      acceptFailed: "Failed to accept citation",
      pipelineSplit: "Splitting text into sentences",
      pipelineClassify: "Classifying citation needs",
      pipelineClassifyDetail: "AI analyzing each sentence...",
      pipelinePrepare: "Preparing citation check",
      pipelineFound: "sentences need citations",
      pipelineQuery: "Generating search query",
      pipelineSearch: "Searching paper databases",
      pipelineRank: "Ranking by relevance",
    },
  };
  return labels[locale] ?? labels.en;
}
