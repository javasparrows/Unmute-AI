"use client";

import { useRef, useCallback, useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ArrowLeftIcon, Loader2, Pencil, Settings, BookOpenCheck } from "lucide-react";
import type { LanguageCode, AlignmentGroup } from "@/types";
import { useSyncTranslation } from "@/hooks/use-sync-translation";
import { useSentenceSync } from "@/hooks/use-sentence-sync";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { UserMenu } from "@/components/auth/user-menu";
import { splitSentences, computeSentenceRanges } from "@/lib/split-sentences";
import { getGroupIndices } from "@/lib/alignment";
import { EditorPanel } from "./editor-panel";
import { TranslationStatus } from "./translation-status";
import { LanguageSelector } from "../settings/language-selector";
import { JournalSelector } from "../settings/journal-selector";

import { renameDocument } from "@/app/actions/document";
import { StructureCheckDialog } from "../structure-check/structure-check-dialog";
import { SaveButton } from "./save-button";
import { VersionPanel } from "../version/version-panel";
import { EvidencePanel } from "@/components/evidence/evidence-panel";
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

  const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("unmute:evidence-panel-open") === "true";
  });

  const toggleEvidencePanel = useCallback(() => {
    setIsEvidencePanelOpen((prev) => {
      const next = !prev;
      localStorage.setItem("unmute:evidence-panel-open", String(next));
      return next;
    });
  }, []);

  // Cmd+E to toggle evidence panel
  useEffect(() => {
    function handleEvidenceShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        toggleEvidencePanel();
      }
    }
    document.addEventListener("keydown", handleEvidenceShortcut);
    return () => document.removeEventListener("keydown", handleEvidenceShortcut);
  }, [toggleEvidencePanel]);

  const [displayTitle, setDisplayTitle] = useState(documentTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(documentTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [, startTitleTransition] = useTransition();

  const handleStartTitleEdit = useCallback(() => {
    setEditTitle(displayTitle);
    setIsEditingTitle(true);
    requestAnimationFrame(() => titleInputRef.current?.select());
  }, [displayTitle]);

  const handleSaveTitle = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== displayTitle) {
      setDisplayTitle(trimmed);
      startTitleTransition(() => renameDocument(documentId, trimmed));
    }
    setIsEditingTitle(false);
  }, [editTitle, displayTitle, documentId]);

  const handleCancelTitleEdit = useCallback(() => {
    setEditTitle(displayTitle);
    setIsEditingTitle(false);
  }, [displayTitle]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSaveTitle();
      } else if (e.key === "Escape") {
        handleCancelTitleEdit();
      }
    },
    [handleSaveTitle, handleCancelTitleEdit],
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

  const {
    isSyncing,
    syncingDirection,
    error,
    syncLeftToRight,
    syncRightToLeft,
    initSnapshots,
  } = useSyncTranslation({});

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
          <Link href="/dashboard" className="text-sm font-serif font-bold tracking-tight hover:opacity-80 transition-opacity hidden sm:inline">
            Unmute AI
          </Link>
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
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleTitleKeyDown}
              className="text-lg font-semibold tracking-tight bg-transparent border-b border-secondary-foreground/40 outline-none px-1 min-w-[120px] text-secondary-foreground"
            />
          ) : (
            <button
              onClick={handleStartTitleEdit}
              className="group/title flex items-center gap-1 text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity cursor-text"
            >
              {displayTitle}
              <Pencil className="h-3.5 w-3.5 opacity-0 group-hover/title:opacity-50 transition-opacity" />
            </button>
          )}
          <TranslationStatus isTranslating={isSyncing} error={error} />
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isEvidencePanelOpen ? "default" : "ghost"}
                size="sm"
                onClick={toggleEvidencePanel}
                className="gap-1.5"
              >
                <BookOpenCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Evidence</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>エビデンスパネル (Cmd+E)</TooltipContent>
          </Tooltip>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/settings/preferences?returnTo=/documents/${documentId}`}>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>設定</TooltipContent>
          </Tooltip>
          {user && (
            <>
              <Separator orientation="vertical" className="h-6 bg-secondary-foreground/20" />
              <UserMenu user={user} />
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

        {/* Evidence side panel */}
        <EvidencePanel
          isOpen={isEvidencePanelOpen}
          onClose={() => {
            setIsEvidencePanelOpen(false);
            localStorage.setItem("unmute:evidence-panel-open", "false");
          }}
          documentId={documentId}
        />
      </div>
    </div>
  );
}
