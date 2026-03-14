"use client";

import { useState, useRef, useTransition, useMemo } from "react";
import { useLocale } from "next-intl";
import { Search, Loader2, Lightbulb, ArrowRight } from "lucide-react";
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

interface EvidenceSearchProps {
  documentId: string;
}

export function EvidenceSearch({ documentId }: EvidenceSearchProps) {
  const locale = useLocale();
  const searchExamples = useMemo(() => getSearchExamples(locale), [locale]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaperCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [, startTransition] = useTransition();
  const isComposingRef = useRef(false);
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

      {/* Search Guide (shown when no query and no results) */}
      {!query.trim() && results.length === 0 && !isSearching && (
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
