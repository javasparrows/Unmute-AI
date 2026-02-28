"use client";

import { useRef, useCallback, useMemo } from "react";
import type { LanguageCode, TranslationSource, TranslationProvider } from "@/types";
import { useSentenceTranslation } from "@/hooks/use-sentence-translation";
import { useSentenceSync } from "@/hooks/use-sentence-sync";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useCostTracking } from "@/hooks/use-cost-tracking";
import { splitSentences, computeSentenceRanges } from "@/lib/split-sentences";
import { historyStore } from "@/lib/history-store";
import { EditorPanel } from "./editor-panel";
import { TranslationStatus } from "./translation-status";
import { CostDisplay } from "./cost-display";
import { LanguageSelector } from "../settings/language-selector";
import { JournalSelector } from "../settings/journal-selector";
import { ProviderSelector } from "../settings/provider-selector";
import { SettingsPanel } from "../settings/settings-panel";
import { HistoryPanel } from "../history/history-panel";
import { StructureCheckDialog } from "../structure-check/structure-check-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function EditorPage() {
  const [leftText, setLeftText] = useLocalStorage("editor-left-text", "");
  const [rightText, setRightText] = useLocalStorage("editor-right-text", "");
  const [leftLang, setLeftLang] = useLocalStorage<LanguageCode>("left-lang", "ja");
  const [rightLang, setRightLang] = useLocalStorage<LanguageCode>("right-lang", "en");
  const [journal, setJournal] = useLocalStorage("journal", "general");
  const [provider, setProvider] = useLocalStorage<TranslationProvider>(
    "translation-provider",
    "deepl",
  );

  // Loop prevention: tracks which panel initiated the translation
  const translationSourceRef = useRef<TranslationSource>(null);
  // Track latest left text for re-translation after language detection
  const leftTextRef = useRef(leftText);
  leftTextRef.current = leftText;

  const { costs, addUsage } = useCostTracking();

  const {
    isTranslating,
    translate,
    cancelTranslation,
    translatedText,
    setTranslatedText,
    translatedSentenceRanges: hookTranslatedRanges,
    error,
  } = useSentenceTranslation({ onUsage: addUsage });

  // Compute sentence ranges directly from current text (always available, even after reload)
  const sourceSentenceRanges = useMemo(
    () => computeSentenceRanges(splitSentences(leftText)),
    [leftText],
  );
  // Fallback: re-parse translated text (used after reload when hook ranges are empty)
  const fallbackTranslatedRanges = useMemo(
    () => computeSentenceRanges(splitSentences(rightText)),
    [rightText],
  );
  // Prefer hook's token-based ranges (preserves 1:1 source-translation mapping)
  // Fall back to re-parsed ranges only after page reload
  const translatedSentenceRanges =
    hookTranslatedRanges.length > 0
      ? hookTranslatedRanges
      : fallbackTranslatedRanges;

  const {
    activeSentenceIndex,
    activePanel,
    setSentence,
    clearHighlight,
  } = useSentenceSync();

  const {
    leftRef: leftScrollRef,
    rightRef: rightScrollRef,
    handleLeftScroll,
    handleRightScroll,
  } = useScrollSync();

  // Apply streamed translation to the correct panel
  const prevTranslatedRef = useRef("");
  if (translatedText !== prevTranslatedRef.current) {
    prevTranslatedRef.current = translatedText;
    if (translationSourceRef.current === "left") {
      setRightText(translatedText);
    } else if (translationSourceRef.current === "right") {
      setLeftText(translatedText);
    }
  }

  const handleLeftChange = useCallback(
    (value: string) => {
      setLeftText(value);
      translationSourceRef.current = "left";
      translate(value, leftLang, rightLang, journal, provider);
    },
    [leftLang, rightLang, journal, provider, translate],
  );

  const handleRightChange = useCallback(
    (value: string) => {
      setRightText(value);
      translationSourceRef.current = "right";
      translate(value, rightLang, leftLang, journal, provider);
    },
    [leftLang, rightLang, journal, provider, translate],
  );

  const handleLeftSentence = useCallback(
    (index: number) => {
      setSentence(index, "left");
    },
    [setSentence],
  );

  const handleRightSentence = useCallback(
    (index: number) => {
      setSentence(index, "right");
    },
    [setSentence],
  );

  const handleBlur = useCallback(() => {
    clearHighlight();
  }, [clearHighlight]);

  // Auto-detect language on paste
  const handlePaste = useCallback(
    async (pastedText: string) => {
      try {
        const res = await fetch("/api/detect-language", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pastedText }),
        });
        const { language } = (await res.json()) as { language: LanguageCode };

        // If detected language differs from left panel, swap
        if (language !== leftLang) {
          const newTargetLang = language === rightLang ? leftLang : rightLang;
          setLeftLang(language);
          if (language === rightLang) {
            setRightLang(leftLang);
          }
          // Re-trigger translation with correct language params.
          // The debounced translate from handleLeftChange used stale langs,
          // so we cancel it and call again with the detected languages.
          cancelTranslation();
          translationSourceRef.current = "left";
          translate(leftTextRef.current, language, newTargetLang, journal, provider);
        }
      } catch {
        // Silently fail — language detection is optional
      }
    },
    [leftLang, rightLang, setLeftLang, setRightLang, cancelTranslation, translate, journal, provider],
  );

  const handleSaveHistory = useCallback(() => {
    if (!leftText.trim() && !rightText.trim()) return;
    historyStore.addEntry({
      sourceText: leftText,
      translatedText: rightText,
      sourceLang: leftLang,
      targetLang: rightLang,
      journal,
    });
  }, [leftText, rightText, leftLang, rightLang, journal]);

  const handleRestoreHistory = useCallback(
    (entry: { sourceText: string; translatedText: string; sourceLang: LanguageCode; targetLang: LanguageCode; journal?: string }) => {
      cancelTranslation();
      translationSourceRef.current = null;
      setLeftText(entry.sourceText);
      setRightText(entry.translatedText);
      setLeftLang(entry.sourceLang);
      setRightLang(entry.targetLang);
      if (entry.journal) setJournal(entry.journal);
    },
    [cancelTranslation, setLeftLang, setRightLang, setJournal],
  );

  const handleSwapLanguages = useCallback(() => {
    const tmpLang = leftLang;
    const tmpText = leftText;
    setLeftLang(rightLang);
    setRightLang(tmpLang);
    setLeftText(rightText);
    setRightText(tmpText);
    translationSourceRef.current = null;
  }, [leftLang, rightLang, leftText, rightText, setLeftLang, setRightLang]);

  const handleClear = useCallback(() => {
    cancelTranslation();
    translationSourceRef.current = null;
    setLeftText("");
    setRightText("");
    setTranslatedText("");
  }, [cancelTranslation, setTranslatedText]);

  // Scroll sync: attach listeners via callback refs
  const setLeftEditorRef = useCallback(
    (node: HTMLDivElement | null) => {
      leftScrollRef.current = node;
      if (node) {
        node.addEventListener("scroll", handleLeftScroll, { passive: true });
      }
    },
    [leftScrollRef, handleLeftScroll],
  );

  const setRightEditorRef = useCallback(
    (node: HTMLDivElement | null) => {
      rightScrollRef.current = node;
      if (node) {
        node.addEventListener("scroll", handleRightScroll, { passive: true });
      }
    },
    [rightScrollRef, handleRightScroll],
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-secondary text-secondary-foreground shadow-md">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">
            Translation Editor
          </h1>
          <TranslationStatus isTranslating={isTranslating} error={error} />
          <Separator orientation="vertical" className="h-6 bg-secondary-foreground/20" />
          <CostDisplay costs={costs} />
        </div>
        <div className="flex items-center gap-2">
          <StructureCheckDialog
            leftText={leftText}
            rightText={rightText}
            leftLang={leftLang}
            rightLang={rightLang}
          />
          <HistoryPanel
            onRestore={handleRestoreHistory}
            onSave={handleSaveHistory}
          />
          <SettingsPanel />
        </div>
      </header>

      {/* Language bar */}
      <div className="flex items-center justify-center gap-3 px-6 py-2 bg-card shadow-sm">
        <LanguageSelector value={leftLang} onChange={setLeftLang} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwapLanguages}
              className="text-muted-foreground hover:text-foreground"
            >
              ⇄
            </Button>
          </TooltipTrigger>
          <TooltipContent>言語を入れ替え</TooltipContent>
        </Tooltip>
        <LanguageSelector value={rightLang} onChange={setRightLang} />
        <Separator orientation="vertical" className="h-6" />
        <JournalSelector value={journal} onChange={setJournal} />
        <Separator orientation="vertical" className="h-6" />
        <ProviderSelector value={provider} onChange={setProvider} />
        <Separator orientation="vertical" className="h-6" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-destructive"
            >
              クリア
            </Button>
          </TooltipTrigger>
          <TooltipContent>テキストをすべてクリア</TooltipContent>
        </Tooltip>
      </div>

      {/* Editor panels */}
      <div className="flex flex-1 min-h-0">
        <EditorPanel
          label="原文"
          content={leftText}
          onTextChange={handleLeftChange}
          onSentenceChange={handleLeftSentence}
          onBlur={handleBlur}
          onPaste={handlePaste}
          activeSentenceIndex={activeSentenceIndex}
          sentenceRanges={sourceSentenceRanges}
          placeholder="ここにテキストを入力またはペースト..."
          containerRef={setLeftEditorRef}
        />
        <Separator orientation="vertical" />
        <EditorPanel
          label="翻訳"
          content={rightText}
          onTextChange={handleRightChange}
          onSentenceChange={handleRightSentence}
          onBlur={handleBlur}
          activeSentenceIndex={activeSentenceIndex}
          sentenceRanges={translatedSentenceRanges}
          placeholder="翻訳がここに表示されます..."
          containerRef={setRightEditorRef}
        />
      </div>
    </div>
  );
}
