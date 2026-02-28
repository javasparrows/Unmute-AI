"use client";

import { useRef, useCallback, useMemo } from "react";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import type { LanguageCode, TranslationProvider } from "@/types";
import { useSyncTranslation } from "@/hooks/use-sync-translation";
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

  // Track latest text values for sync callbacks
  const leftTextRef = useRef(leftText);
  leftTextRef.current = leftText;
  const rightTextRef = useRef(rightText);
  rightTextRef.current = rightText;

  const { costs, addUsage } = useCostTracking();

  const {
    isSyncing,
    error,
    syncLeftToRight,
    syncRightToLeft,
    initSnapshots,
  } = useSyncTranslation({ onUsage: addUsage });

  // Track translated sentence ranges from last sync
  const translatedRangesRef = useRef<{ from: number; to: number }[]>([]);

  // Compute sentence ranges directly from current text
  const sourceSentenceRanges = useMemo(
    () => computeSentenceRanges(splitSentences(leftText)),
    [leftText],
  );
  const fallbackTranslatedRanges = useMemo(
    () => computeSentenceRanges(splitSentences(rightText)),
    [rightText],
  );
  const translatedSentenceRanges =
    translatedRangesRef.current.length > 0
      ? translatedRangesRef.current
      : fallbackTranslatedRanges;

  const {
    activeSentenceIndex,
    setSentence,
    clearHighlight,
  } = useSentenceSync();

  const {
    leftRef: leftScrollRef,
    rightRef: rightScrollRef,
    handleLeftScroll,
    handleRightScroll,
  } = useScrollSync();

  // Text change handlers — save only, no translation
  const handleLeftChange = useCallback(
    (value: string) => {
      setLeftText(value);
    },
    [],
  );

  const handleRightChange = useCallback(
    (value: string) => {
      setRightText(value);
    },
    [],
  );

  // Sync handlers
  const handleSyncLeftToRight = useCallback(async () => {
    const result = await syncLeftToRight(
      leftTextRef.current,
      rightTextRef.current,
      leftLang,
      rightLang,
      journal,
      provider,
    );
    if (result) {
      setRightText(result.text);
      translatedRangesRef.current = result.sentenceRanges;
    }
  }, [leftLang, rightLang, journal, provider, syncLeftToRight]);

  const handleSyncRightToLeft = useCallback(async () => {
    const result = await syncRightToLeft(
      leftTextRef.current,
      rightTextRef.current,
      leftLang,
      rightLang,
      journal,
      provider,
    );
    if (result) {
      setLeftText(result.text);
      translatedRangesRef.current = result.sentenceRanges;
    }
  }, [leftLang, rightLang, journal, provider, syncRightToLeft]);

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
          setLeftLang(language);
          if (language === rightLang) {
            setRightLang(leftLang);
          }
        }
      } catch {
        // Silently fail — language detection is optional
      }
    },
    [leftLang, rightLang, setLeftLang, setRightLang],
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
      setLeftText(entry.sourceText);
      setRightText(entry.translatedText);
      setLeftLang(entry.sourceLang);
      setRightLang(entry.targetLang);
      if (entry.journal) setJournal(entry.journal);
      initSnapshots(entry.sourceText, entry.translatedText);
    },
    [setLeftLang, setRightLang, setJournal, initSnapshots],
  );

  const handleSwapLanguages = useCallback(() => {
    const tmpLang = leftLang;
    const tmpText = leftText;
    setLeftLang(rightLang);
    setRightLang(tmpLang);
    setLeftText(rightText);
    setRightText(tmpText);
    initSnapshots(rightText, tmpText);
  }, [leftLang, rightLang, leftText, rightText, setLeftLang, setRightLang, initSnapshots]);

  const handleClear = useCallback(() => {
    setLeftText("");
    setRightText("");
    translatedRangesRef.current = [];
    initSnapshots("", "");
  }, [initSnapshots]);

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
          <TranslationStatus isTranslating={isSyncing} error={error} />
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

      {/* Editor panels with sync buttons */}
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

        {/* Sync buttons column */}
        <div className="flex flex-col items-center justify-center gap-3 px-2 bg-muted/30 border-x">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSyncLeftToRight}
                disabled={isSyncing || !leftText.trim()}
                className="h-10 w-10 rounded-full"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">原文の変更を翻訳に反映</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSyncRightToLeft}
                disabled={isSyncing || !rightText.trim()}
                className="h-10 w-10 rounded-full"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">翻訳の変更を原文に反映</TooltipContent>
          </Tooltip>
        </div>

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
