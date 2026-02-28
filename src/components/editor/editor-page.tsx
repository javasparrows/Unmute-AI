"use client";

import { useState, useRef, useCallback } from "react";
import type { LanguageCode, TranslationSource } from "@/types";
import { useTranslation } from "@/hooks/use-translation";
import { useSentenceSync } from "@/hooks/use-sentence-sync";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { historyStore } from "@/lib/history-store";
import { EditorPanel } from "./editor-panel";
import { TranslationStatus } from "./translation-status";
import { LanguageSelector } from "../settings/language-selector";
import { JournalSelector } from "../settings/journal-selector";
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
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [leftLang, setLeftLang] = useLocalStorage<LanguageCode>("left-lang", "ja");
  const [rightLang, setRightLang] = useLocalStorage<LanguageCode>("right-lang", "en");
  const [journal, setJournal] = useLocalStorage("journal", "general");

  // Loop prevention: tracks which panel initiated the translation
  const translationSourceRef = useRef<TranslationSource>(null);

  const {
    isTranslating,
    translate,
    cancelTranslation,
    translatedText,
    setTranslatedText,
    error,
  } = useTranslation();

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
      translate(value, leftLang, rightLang, journal);
    },
    [leftLang, rightLang, journal, translate],
  );

  const handleRightChange = useCallback(
    (value: string) => {
      setRightText(value);
      translationSourceRef.current = "right";
      translate(value, rightLang, leftLang, journal);
    },
    [leftLang, rightLang, journal, translate],
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
          setLeftLang(language);
          // Set the other panel to the previous left language
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
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Translation Editor
          </h1>
          <TranslationStatus isTranslating={isTranslating} error={error} />
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
      <div className="flex items-center justify-center gap-3 px-6 py-2 border-b border-border bg-muted/30">
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
          placeholder="翻訳がここに表示されます..."
          containerRef={setRightEditorRef}
        />
      </div>
    </div>
  );
}
