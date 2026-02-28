"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ArrowLeftIcon, Loader2 } from "lucide-react";
import type { LanguageCode, TranslationProvider } from "@/types";
import { useSyncTranslation } from "@/hooks/use-sync-translation";
import { useSentenceSync } from "@/hooks/use-sentence-sync";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { useCostTracking } from "@/hooks/use-cost-tracking";
import { splitSentences, computeSentenceRanges } from "@/lib/split-sentences";
import { EditorPanel } from "./editor-panel";
import { TranslationStatus } from "./translation-status";
import { CostDisplay } from "./cost-display";
import { LanguageSelector } from "../settings/language-selector";
import { JournalSelector } from "../settings/journal-selector";
import { ProviderSelector } from "../settings/provider-selector";
import { SettingsPanel } from "../settings/settings-panel";
import { StructureCheckDialog } from "../structure-check/structure-check-dialog";
import { SaveButton } from "./save-button";
import { VersionPanel } from "../version/version-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InitialVersion {
  versionNumber: number;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  journal: string | null;
  provider: string | null;
  leftRanges: { from: number; to: number }[] | null;
  rightRanges: { from: number; to: number }[] | null;
}

interface PlanLimitsProps {
  allowedProviders: TranslationProvider[];
  allowedJournalIds: string[] | "all";
}

interface EditorPageClientProps {
  documentId: string;
  documentTitle: string;
  initialVersion: InitialVersion | null;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  planLimits?: PlanLimitsProps;
}

export function EditorPageClient({
  documentId,
  documentTitle,
  initialVersion,
  user,
  planLimits,
}: EditorPageClientProps) {
  const [leftText, setLeftText] = useState(initialVersion?.sourceText ?? "");
  const [rightText, setRightText] = useState(initialVersion?.translatedText ?? "");
  const [leftLang, setLeftLang] = useState<LanguageCode>(
    (initialVersion?.sourceLang as LanguageCode) ?? "ja",
  );
  const [rightLang, setRightLang] = useState<LanguageCode>(
    (initialVersion?.targetLang as LanguageCode) ?? "en",
  );
  const [journal, setJournal] = useState(initialVersion?.journal ?? "general");
  const [provider, setProvider] = useState<TranslationProvider>(
    (initialVersion?.provider as TranslationProvider) ?? "deepl",
  );
  const [currentVersionNumber, setCurrentVersionNumber] = useState(
    initialVersion?.versionNumber ?? 1,
  );

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

  const translatedRangesRef = useRef<{ from: number; to: number }[]>(
    initialVersion?.rightRanges ?? [],
  );
  const sourceRangesRef = useRef<{ from: number; to: number }[]>(
    initialVersion?.leftRanges ?? [],
  );

  const sourceSentenceRanges = useMemo(
    () =>
      sourceRangesRef.current.length > 0
        ? sourceRangesRef.current
        : computeSentenceRanges(splitSentences(leftText)),
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

  const { activeSentenceIndex, setSentence, clearHighlight } =
    useSentenceSync();

  const {
    leftRef: leftScrollRef,
    rightRef: rightScrollRef,
    handleLeftScroll,
    handleRightScroll,
  } = useScrollSync();

  const handleLeftChange = useCallback((value: string) => {
    setLeftText(value);
    sourceRangesRef.current = [];
  }, []);

  const handleRightChange = useCallback((value: string) => {
    setRightText(value);
    translatedRangesRef.current = [];
  }, []);

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
      sourceRangesRef.current = result.sentenceRanges;
    }
  }, [leftLang, rightLang, journal, provider, syncRightToLeft]);

  const handleLeftSentence = useCallback(
    (index: number) => setSentence(index, "left"),
    [setSentence],
  );

  const handleRightSentence = useCallback(
    (index: number) => setSentence(index, "right"),
    [setSentence],
  );

  const handleBlur = useCallback(() => clearHighlight(), [clearHighlight]);

  const handlePaste = useCallback(
    async (pastedText: string) => {
      try {
        const res = await fetch("/api/detect-language", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pastedText }),
        });
        const { language } = (await res.json()) as { language: LanguageCode };
        if (language !== leftLang) {
          setLeftLang(language);
          if (language === rightLang) setRightLang(leftLang);
        }
      } catch {
        // Silently fail
      }
    },
    [leftLang, rightLang],
  );

  const handleSwapLanguages = useCallback(() => {
    const tmpLang = leftLang;
    const tmpText = leftText;
    setLeftLang(rightLang);
    setRightLang(tmpLang);
    setLeftText(rightText);
    setRightText(tmpText);
    initSnapshots(rightText, tmpText);
  }, [leftLang, rightLang, leftText, rightText, initSnapshots]);

  const handleClear = useCallback(() => {
    setLeftText("");
    setRightText("");
    translatedRangesRef.current = [];
    sourceRangesRef.current = [];
    initSnapshots("", "");
  }, [initSnapshots]);

  const handleVersionSaved = useCallback((versionNumber: number) => {
    setCurrentVersionNumber(versionNumber);
  }, []);

  const handleVersionRestored = useCallback(
    (version: InitialVersion) => {
      setLeftText(version.sourceText);
      setRightText(version.translatedText);
      setLeftLang((version.sourceLang as LanguageCode) ?? "ja");
      setRightLang((version.targetLang as LanguageCode) ?? "en");
      if (version.journal) setJournal(version.journal);
      if (version.provider) setProvider(version.provider as TranslationProvider);
      sourceRangesRef.current = version.leftRanges ?? [];
      translatedRangesRef.current = version.rightRanges ?? [];
      setCurrentVersionNumber(version.versionNumber);
      initSnapshots(version.sourceText, version.translatedText);
    },
    [initSnapshots],
  );

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
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeftIcon className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>一覧に戻る</TooltipContent>
          </Tooltip>
          <h1 className="text-lg font-semibold tracking-tight">
            {documentTitle}
          </h1>
          <TranslationStatus isTranslating={isSyncing} error={error} />
          <Separator
            orientation="vertical"
            className="h-6 bg-secondary-foreground/20"
          />
          <CostDisplay costs={costs} />
        </div>
        <div className="flex items-center gap-2">
          <StructureCheckDialog
            leftText={leftText}
            rightText={rightText}
            leftLang={leftLang}
            rightLang={rightLang}
          />
          <SaveButton
            documentId={documentId}
            currentVersionNumber={currentVersionNumber}
            sourceText={leftText}
            translatedText={rightText}
            sourceLang={leftLang}
            targetLang={rightLang}
            journal={journal}
            provider={provider}
            leftRanges={
              sourceRangesRef.current.length > 0
                ? sourceRangesRef.current
                : computeSentenceRanges(splitSentences(leftText))
            }
            rightRanges={
              translatedRangesRef.current.length > 0
                ? translatedRangesRef.current
                : computeSentenceRanges(splitSentences(rightText))
            }
            onSaved={handleVersionSaved}
          />
          <VersionPanel
            documentId={documentId}
            currentVersionNumber={currentVersionNumber}
            onRestore={handleVersionRestored}
          />
          <SettingsPanel />
          {user && (
            <>
              <Separator orientation="vertical" className="h-6 bg-secondary-foreground/20" />
              <div className="flex items-center gap-2">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? ""}
                    className="h-7 w-7 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </>
          )}
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
        <JournalSelector
          value={journal}
          onChange={setJournal}
          allowedJournalIds={planLimits?.allowedJournalIds}
        />
        <Separator orientation="vertical" className="h-6" />
        <ProviderSelector
          value={provider}
          onChange={setProvider}
          allowedProviders={planLimits?.allowedProviders}
        />
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
            <TooltipContent side="right">
              原文の変更を翻訳に反映
            </TooltipContent>
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
            <TooltipContent side="left">
              翻訳の変更を原文に反映
            </TooltipContent>
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
