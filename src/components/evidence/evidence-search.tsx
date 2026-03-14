"use client";

import { useState, useRef, useTransition, useMemo, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { Search, Loader2, Lightbulb, ArrowRight, ArrowUpDown, ChevronDown, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaperCard } from "./paper-card";
import { PaperCardSkeleton } from "./paper-card-skeleton";
import type { PaperCandidate, SectionType } from "@/types/evidence";

interface SearchExample {
  category: string;
  query: string;
  description: string;
}

// Native-language example per locale (shows "you can search in your language")
const NATIVE_LANGUAGE_EXAMPLES: Record<string, SearchExample> = {
  ja: { category: "日本語検索", query: "大規模言語モデルの幻覚問題と対策手法", description: "日本語のクエリは自動的に英語に翻訳されます" },
  "zh-CN": { category: "中文搜索", query: "大语言模型幻觉问题与缓解方法", description: "中文查询会自动翻译为英文" },
  "zh-TW": { category: "中文搜尋", query: "大型語言模型幻覺問題與緩解方法", description: "中文查詢會自動翻譯為英文" },
  ko: { category: "한국어 검색", query: "대규모 언어 모델의 환각 문제와 완화 기법", description: "한국어 쿼리는 자동으로 영어로 번역됩니다" },
  de: { category: "Deutsche Suche", query: "Halluzinationsproblem bei großen Sprachmodellen und Gegenmaßnahmen", description: "Deutsche Anfragen werden automatisch ins Englische übersetzt" },
  fr: { category: "Recherche en français", query: "Problème d'hallucination des grands modèles de langage et méthodes d'atténuation", description: "Les requêtes en français sont automatiquement traduites en anglais" },
  es: { category: "Búsqueda en español", query: "Problema de alucinación en modelos de lenguaje grandes y métodos de mitigación", description: "Las consultas en español se traducen automáticamente al inglés" },
  "pt-BR": { category: "Pesquisa em português", query: "Problema de alucinação em modelos de linguagem grandes e métodos de mitigação", description: "Consultas em português são traduzidas automaticamente para inglês" },
  ru: { category: "Поиск на русском", query: "Проблема галлюцинаций больших языковых моделей и методы борьбы", description: "Запросы на русском автоматически переводятся на английский" },
  it: { category: "Ricerca in italiano", query: "Problema delle allucinazioni nei modelli linguistici di grandi dimensioni e metodi di mitigazione", description: "Le query in italiano vengono tradotte automaticamente in inglese" },
  hi: { category: "हिन्दी खोज", query: "बड़े भाषा मॉडल में मतिभ्रम समस्या और समाधान विधियाँ", description: "हिन्दी प्रश्न स्वचालित रूप से अंग्रेजी में अनुवादित होते हैं" },
  tr: { category: "Türkçe arama", query: "Büyük dil modellerinde halüsinasyon sorunu ve azaltma yöntemleri", description: "Türkçe sorgular otomatik olarak İngilizce'ye çevrilir" },
  ar: { category: "البحث بالعربية", query: "مشكلة الهلوسة في النماذج اللغوية الكبيرة وطرق التخفيف", description: "يتم ترجمة الاستعلامات العربية تلقائيًا إلى الإنجليزية" },
  id: { category: "Pencarian Bahasa Indonesia", query: "Masalah halusinasi model bahasa besar dan metode mitigasi", description: "Kueri Bahasa Indonesia diterjemahkan secara otomatis ke Bahasa Inggris" },
  pl: { category: "Wyszukiwanie po polsku", query: "Problem halucynacji dużych modeli językowych i metody łagodzenia", description: "Zapytania po polsku są automatycznie tłumaczone na angielski" },
  fa: { category: "جستجو به فارسی", query: "مشکل توهم در مدل‌های زبانی بزرگ و روش‌های کاهش", description: "پرسش‌های فارسی به‌طور خودکار به انگلیسی ترجمه می‌شوند" },
};

// Common English examples (shown for all locales)
const ENGLISH_EXAMPLES: SearchExample[] = [
  { category: "Research topic", query: "deep learning for medical image segmentation", description: "Search by research topic or theme" },
  { category: "Research question", query: "What methods improve transformer efficiency for long sequences?", description: "Ask a research question in natural language" },
  { category: "Keywords", query: "CRISPR gene editing efficiency in vivo delivery", description: "Combine multiple keywords" },
  { category: "Specific finding", query: "attention mechanism outperforms recurrent networks for machine translation", description: "Search for papers supporting a specific claim" },
];

function getSearchExamples(locale: string): SearchExample[] {
  const nativeExample = NATIVE_LANGUAGE_EXAMPLES[locale];
  if (locale === "en") return ENGLISH_EXAMPLES;
  // For non-English locales: show native example first, then English examples
  return nativeExample ? [nativeExample, ...ENGLISH_EXAMPLES] : ENGLISH_EXAMPLES;
}

// Ranking & sorting
type SortOption = "relevance" | "citations" | "year-desc" | "year-asc";

const SORT_LABELS: Record<string, Record<SortOption, string>> = {
  ja: { relevance: "関連度順", citations: "引用数順（多→少）", "year-desc": "年順（新→旧）", "year-asc": "年順（旧→新）" },
  en: { relevance: "Relevance", citations: "Citations (high → low)", "year-desc": "Year (new → old)", "year-asc": "Year (old → new)" },
  "zh-CN": { relevance: "相关度", citations: "引用数（多→少）", "year-desc": "年份（新→旧）", "year-asc": "年份（旧→新）" },
  "zh-TW": { relevance: "相關度", citations: "引用數（多→少）", "year-desc": "年份（新→舊）", "year-asc": "年份（舊→新）" },
  ko: { relevance: "관련도순", citations: "인용 수（높→낮）", "year-desc": "연도（최신→오래된）", "year-asc": "연도（오래된→최신）" },
  de: { relevance: "Relevanz", citations: "Zitierungen (hoch → niedrig)", "year-desc": "Jahr (neu → alt)", "year-asc": "Jahr (alt → neu)" },
  fr: { relevance: "Pertinence", citations: "Citations (élevé → faible)", "year-desc": "Année (récent → ancien)", "year-asc": "Année (ancien → récent)" },
  es: { relevance: "Relevancia", citations: "Citas (alto → bajo)", "year-desc": "Año (nuevo → antiguo)", "year-asc": "Año (antiguo → nuevo)" },
  "pt-BR": { relevance: "Relevância", citations: "Citações (alto → baixo)", "year-desc": "Ano (novo → antigo)", "year-asc": "Ano (antigo → novo)" },
  ru: { relevance: "Релевантность", citations: "Цитирования (больше → меньше)", "year-desc": "Год (новые → старые)", "year-asc": "Год (старые → новые)" },
  it: { relevance: "Rilevanza", citations: "Citazioni (alto → basso)", "year-desc": "Anno (nuovo → vecchio)", "year-asc": "Anno (vecchio → nuovo)" },
  hi: { relevance: "प्रासंगिकता", citations: "उद्धरण (अधिक → कम)", "year-desc": "वर्ष (नया → पुराना)", "year-asc": "वर्ष (पुराना → नया)" },
  tr: { relevance: "İlgililik", citations: "Atıflar (çok → az)", "year-desc": "Yıl (yeni → eski)", "year-asc": "Yıl (eski → yeni)" },
  ar: { relevance: "الصلة", citations: "الاستشهادات (أكثر → أقل)", "year-desc": "السنة (جديد → قديم)", "year-asc": "السنة (قديم → جديد)" },
  id: { relevance: "Relevansi", citations: "Sitasi (tinggi → rendah)", "year-desc": "Tahun (baru → lama)", "year-asc": "Tahun (lama → baru)" },
  pl: { relevance: "Trafność", citations: "Cytowania (dużo → mało)", "year-desc": "Rok (nowy → stary)", "year-asc": "Rok (stary → nowy)" },
  fa: { relevance: "مرتبط‌ترین", citations: "ارجاعات (بیشتر → کمتر)", "year-desc": "سال (جدید → قدیم)", "year-asc": "سال (قدیم → جدید)" },
};

function getSortLabels(locale: string): Record<SortOption, string> {
  return SORT_LABELS[locale] ?? SORT_LABELS.en;
}

const SORT_OPTION_KEYS: SortOption[] = ["relevance", "citations", "year-desc", "year-asc"];

// Search history persistence
interface SearchHistoryEntry {
  query: string;
  results: PaperCandidate[];
  timestamp: number;
}

const MAX_HISTORY_ENTRIES = 50;

function getHistoryStorageKey(documentId: string): string {
  return `unmute:search-history:${documentId}`;
}

function loadSearchHistory(documentId: string): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getHistoryStorageKey(documentId));
    if (!raw) return [];
    return JSON.parse(raw) as SearchHistoryEntry[];
  } catch {
    return [];
  }
}

function saveSearchHistory(documentId: string, history: SearchHistoryEntry[]): void {
  try {
    localStorage.setItem(getHistoryStorageKey(documentId), JSON.stringify(history));
  } catch {
    // localStorage full or unavailable -- silently ignore
  }
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function truncateQuery(query: string, maxLength: number = 30): string {
  if (query.length <= maxLength) return query;
  return query.slice(0, maxLength) + "...";
}

function computeRelevanceScore(paper: PaperCandidate): number {
  const currentYear = new Date().getFullYear();

  // Citation score: log-normalize to handle wide range (0 to 100k+)
  const citationCount = paper.citationCount ?? 0;
  const citationScore = citationCount > 0 ? Math.log10(citationCount + 1) / 5 : 0; // max ~1.0

  // Recency boost: papers from last 3 years get full boost, decays after
  const year = paper.year ?? currentYear - 10;
  const age = currentYear - year;
  const recencyScore = age <= 3 ? 1.0 : age <= 5 ? 0.7 : age <= 10 ? 0.4 : 0.2;

  // Provider relevance (if returned by provider)
  const providerScore = paper.relevanceScore ?? 0.5;

  // Has abstract (more useful for evidence extraction)
  const abstractScore = paper.abstract ? 1.0 : 0.0;

  return (
    0.40 * citationScore +
    0.30 * Math.min(providerScore, 1.0) +
    0.20 * recencyScore +
    0.10 * abstractScore
  );
}

function sortPapers(papers: PaperCandidate[], sortBy: SortOption): PaperCandidate[] {
  const sorted = [...papers];
  switch (sortBy) {
    case "relevance":
      return sorted.sort((a, b) => computeRelevanceScore(b) - computeRelevanceScore(a));
    case "citations":
      return sorted.sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0));
    case "year-desc":
      return sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    case "year-asc":
      return sorted.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    default:
      return sorted;
  }
}

interface EvidenceSearchProps {
  documentId: string;
}

export function EvidenceSearch({ documentId }: EvidenceSearchProps) {
  const locale = useLocale();
  const searchExamples = useMemo(() => getSearchExamples(locale), [locale]);
  const sortLabels = useMemo(() => getSortLabels(locale), [locale]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaperCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [, startTransition] = useTransition();
  const isComposingRef = useRef(false);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(loadSearchHistory(documentId));
  }, [documentId]);

  const restoreHistoryEntry = useCallback((entry: SearchHistoryEntry) => {
    setQuery(entry.query);
    setResults(entry.results);
    setSearchStatus(`Found ${entry.results.length} papers`);
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    saveSearchHistory(documentId, []);
  }, [documentId]);

  const sortedResults = useMemo(() => sortPapers(results, sortBy), [results, sortBy]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 72)}px`; // min 72px (~3 rows)
  }

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

      // Save to search history
      const newEntry: SearchHistoryEntry = {
        query: query.trim(),
        results: data.candidates,
        timestamp: Date.now(),
      };
      setSearchHistory((prev) => {
        const updated = [newEntry, ...prev].slice(0, MAX_HISTORY_ENTRIES);
        saveSearchHistory(documentId, updated);
        return updated;
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
          ref={textareaRef}
          placeholder="研究トピックやキーワードを入力...&#10;例: deep learning for medical image segmentation"
          value={query}
          onChange={(e) => { setQuery(e.target.value); autoResize(); }}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
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

      {/* Sort controls (shown when results exist) */}
      {results.length > 0 && (
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="gap-1.5 text-xs h-7 w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3" />
              {sortLabels[sortBy]}
            </span>
            <ChevronDown className={`h-3 w-3 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
          </Button>
          {isSortOpen && (
            <div className="absolute z-10 mt-1 w-full bg-background border border-border rounded-md shadow-md py-1">
              {SORT_OPTION_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => { setSortBy(key); setIsSortOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${
                    sortBy === key ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {sortLabels[key]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Guide (shown when no query and no results and no history) */}
      {!query.trim() && results.length === 0 && !isSearching && searchHistory.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span>How to search</span>
          </div>
          <div className="space-y-2">
            {searchExamples.map((example) => (
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

      {/* Search History (shown when input is empty, no results, and history exists) */}
      {!query.trim() && results.length === 0 && !isSearching && searchHistory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Search History</span>
          </div>
          <div className="border-t border-border" />
          <div className="space-y-1">
            {searchHistory.map((entry, i) => (
              <button
                key={`${entry.timestamp}-${i}`}
                onClick={() => restoreHistoryEntry(entry)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 transition-colors group flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    &quot;{truncateQuery(entry.query)}&quot;
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.results.length} paper{entry.results.length !== 1 ? "s" : ""} · {formatTimeAgo(entry.timestamp)}
                  </p>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
          <div className="flex justify-center pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Clear History
            </Button>
          </div>
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
        {sortedResults.map((paper, i) => (
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
