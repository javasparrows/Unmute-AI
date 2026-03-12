"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ArrowLeftIcon, Loader2 } from "lucide-react";
import type { LanguageCode, AlignmentGroup } from "@/types";
import { useSyncTranslation } from "@/hooks/use-sync-translation";
import { useSentenceSync } from "@/hooks/use-sentence-sync";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { useCostTracking } from "@/hooks/use-cost-tracking";
import { splitSentences, computeSentenceRanges } from "@/lib/split-sentences";
import { getGroupIndices } from "@/lib/alignment";
import { EditorPanel } from "./editor-panel";
import { TranslationStatus } from "./translation-status";
import { CostDisplay } from "./cost-display";
import { LanguageSelector } from "../settings/language-selector";
import { JournalSelector } from "../settings/journal-selector";

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
  sentenceAlignments: AlignmentGroup[] | null;
}

interface PlanLimitsProps {
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
  const [currentVersionNumber, setCurrentVersionNumber] = useState(
    initialVersion?.versionNumber ?? 1,
  );

  // Auto-swap: when one language is changed to match the other, swap them
  const handleLeftLangChange = useCallback(
    (lang: LanguageCode) => {
      if (lang === rightLang) setRightLang(leftLang);
      setLeftLang(lang);
    },
    [leftLang, rightLang],
  );

  const handleRightLangChange = useCallback(
    (lang: LanguageCode) => {
      if (lang === leftLang) setLeftLang(rightLang);
      setRightLang(lang);
    },
    [leftLang, rightLang],
  );

  const leftTextRef = useRef(leftText);
  leftTextRef.current = leftText;
  const rightTextRef = useRef(rightText);
  rightTextRef.current = rightText;

  const alignmentRef = useRef<AlignmentGroup[]>(
    initialVersion?.sentenceAlignments ?? [],
  );

  const { costs, addUsage } = useCostTracking();

  const {
    isSyncing,
    syncingDirection,
    error,
    syncLeftToRight,
    syncRightToLeft,
    initSnapshots,
  } = useSyncTranslation({ onUsage: addUsage });

  const initialSourceTextRef = useRef(initialVersion?.sourceText ?? "");
  const initialTranslatedTextRef = useRef(initialVersion?.translatedText ?? "");

  // Seed sentence snapshots from loaded version so first sync can do partial retranslation.
  useEffect(() => {
    initSnapshots(initialSourceTextRef.current, initialTranslatedTextRef.current);
  }, [initSnapshots]);

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

  const {
    activeLeftIndices,
    activeRightIndices,
    setSentenceGroup,
    clearHighlight,
  } = useSentenceSync();

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
      alignmentRef.current.length > 0 ? alignmentRef.current : undefined,
    );
    if (result) {
      setRightText(result.text);
      translatedRangesRef.current = result.sentenceRanges;
      alignmentRef.current = result.alignment;
    }
  }, [leftLang, rightLang, journal, syncLeftToRight]);

  const handleSyncRightToLeft = useCallback(async () => {
    // For right-to-left, swap alignment direction before passing
    const swappedAlignment =
      alignmentRef.current.length > 0
        ? alignmentRef.current.map((g) => ({ left: g.right, right: g.left }))
        : undefined;
    const result = await syncRightToLeft(
      leftTextRef.current,
      rightTextRef.current,
      leftLang,
      rightLang,
      journal,
      swappedAlignment,
    );
    if (result) {
      setLeftText(result.text);
      sourceRangesRef.current = result.sentenceRanges;
      // Swap back for storage (left=source, right=target in stored alignment)
      alignmentRef.current = result.alignment.map((g) => ({
        left: g.right,
        right: g.left,
      }));
    }
  }, [leftLang, rightLang, journal, syncRightToLeft]);

  const handleLeftSentence = useCallback(
    (index: number) => {
      const alignment = alignmentRef.current;
      if (alignment.length > 0) {
        const group = getGroupIndices(alignment, index, "left");
        if (group) {
          setSentenceGroup(group.left, group.right, "left");
          return;
        }
      }
      // Fallback: highlight same index on both sides
      setSentenceGroup([index], [index], "left");
    },
    [setSentenceGroup],
  );

  const handleRightSentence = useCallback(
    (index: number) => {
      const alignment = alignmentRef.current;
      if (alignment.length > 0) {
        const group = getGroupIndices(alignment, index, "right");
        if (group) {
          setSentenceGroup(group.left, group.right, "right");
          return;
        }
      }
      // Fallback: highlight same index on both sides
      setSentenceGroup([index], [index], "right");
    },
    [setSentenceGroup],
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
    // Swap alignment
    alignmentRef.current = alignmentRef.current.map((g) => ({
      left: g.right,
      right: g.left,
    }));
    initSnapshots(rightText, tmpText);
  }, [leftLang, rightLang, leftText, rightText, initSnapshots]);

  const handleClear = useCallback(() => {
    setLeftText("");
    setRightText("");
    translatedRangesRef.current = [];
    sourceRangesRef.current = [];
    alignmentRef.current = [];
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
      sourceRangesRef.current = version.leftRanges ?? [];
      translatedRangesRef.current = version.rightRanges ?? [];
      alignmentRef.current = version.sentenceAlignments ?? [];
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
            sentenceAlignments={
              alignmentRef.current.length > 0
                ? alignmentRef.current
                : undefined
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
        <LanguageSelector value={leftLang} onChange={handleLeftLangChange} />
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
        <LanguageSelector value={rightLang} onChange={handleRightLangChange} />
        <Separator orientation="vertical" className="h-6" />
        <JournalSelector
          value={journal}
          onChange={setJournal}
          allowedJournalIds={planLimits?.allowedJournalIds}
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
          activeSentenceIndices={activeLeftIndices}
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
                {syncingDirection === "left" ? (
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
                {syncingDirection === "right" ? (
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
          activeSentenceIndices={activeRightIndices}
          sentenceRanges={translatedSentenceRanges}
          placeholder="翻訳がここに表示されます..."
          containerRef={setRightEditorRef}
        />
      </div>
    </div>
  );
}
