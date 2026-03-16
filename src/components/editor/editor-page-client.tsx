"use client";

import { useRef, useCallback, useMemo, useState, useEffect, useTransition } from "react";
import { WorkflowTabs, type WorkflowTab } from "./workflow-tabs";
import { SectionRail } from "./section-rail";
import { CitationsView } from "./citations-view";
import { ReviewView } from "./review-view";
import { normalizeSections, type SectionType } from "@/lib/sections";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ArrowDown, ArrowUp, ArrowLeftIcon, Download, GripVertical, Loader2, Pencil, Settings, BookOpenCheck, Map, X } from "lucide-react";
import type { LanguageCode, AlignmentGroup } from "@/types";
import { useResizablePanels } from "@/hooks/use-resizable-panels";
import { useSyncTranslation } from "@/hooks/use-sync-translation";
import { useSentenceSync } from "@/hooks/use-sentence-sync";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { UserMenu } from "@/components/auth/user-menu";
import { Badge } from "@/components/ui/badge";
import { splitSentences, computeSentenceRanges } from "@/lib/split-sentences";
import { getGroupIndices } from "@/lib/alignment";
import { EditorPanel } from "./editor-panel";
import { CoverageBar } from "./coverage-bar";
import { ParagraphActions } from "./paragraph-actions";
import { TranslationStatus } from "./translation-status";
import { LanguageSelector } from "../settings/language-selector";
import { JournalSelector } from "../settings/journal-selector";

import { renameDocument } from "@/app/actions/document";
import { JourneySidebar } from "@/components/journey/journey-sidebar";
import type { TaskDefinition } from "@/lib/journey/task-registry";
import { StructureCheckDialog } from "../structure-check/structure-check-dialog";
import { ExportDialog } from "./export-dialog";
import { PomodoroTimer } from "./pomodoro-timer";
import { SaveButton } from "./save-button";
import { VersionPanel } from "../version/version-panel";
import { EvidencePanel } from "@/components/evidence/evidence-panel";
import { HighlightColorPicker } from "./citation-color-picker";
import { useHighlightColors } from "@/hooks/use-highlight-colors";
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
  sections: Record<string, unknown> | null;
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
    role?: string;
  };
  planLimits?: PlanLimitsProps;
}

/**
 * Convert a global sentence index (0-based) to a paragraph + sentence position.
 * Uses the same sentence-ending heuristic as the textStats useMemo.
 */
function sentenceIndexToPosition(
  text: string,
  globalIndex: number,
): { paragraphIndex: number; sentenceInParagraph: number } {
  const paragraphs = text.trim() ? text.split(/\n\n+/) : [];
  let remaining = globalIndex;
  for (let i = 0; i < paragraphs.length; i++) {
    const ends = paragraphs[i].match(/[.。!?！？]/g);
    const count = ends?.length ?? (paragraphs[i].trim() ? 1 : 0);
    if (remaining < count) {
      return { paragraphIndex: i + 1, sentenceInParagraph: remaining + 1 };
    }
    remaining -= count;
  }
  // Fallback: last paragraph
  return { paragraphIndex: Math.max(paragraphs.length, 1), sentenceInParagraph: 1 };
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

  const {
    citationColorId,
    setCitationColor,
    citationColor,
    sentenceColorId,
    setSentenceColor,
    sentenceColor,
  } = useHighlightColors();

  const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("unmute:evidence-panel-open");
    if (stored !== null) return stored === "true";
    return (initialVersion?.translatedText?.trim().length ?? 0) > 0;
  });

  const [activeTab, setActiveTab] = useState<WorkflowTab>("write");
  const [activeSection, setActiveSection] = useState<SectionType | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [mobileJourneyOpen, setMobileJourneyOpen] = useState(false);

  const {
    ratio: splitRatio,
    containerRef: splitContainerRef,
    handleMouseDown: handleSplitMouseDown,
    handleTouchStart: handleSplitTouchStart,
  } = useResizablePanels({
    storageKey: "unmute:split-ratio",
    defaultRatio: 0.5,
    minRatio: 0.2,
    maxRatio: 0.8,
  });

  const sections = useMemo(
    () => normalizeSections(initialVersion?.sections ?? null, rightText),
    [initialVersion?.sections, rightText],
  );

  const citationCount = useMemo(() => {
    const matches = rightText.match(/\\cite\{[^}]+\}/g);
    return matches?.length ?? 0;
  }, [rightText]);

  const textStats = useMemo(() => {
    const leftParas = leftText.trim() ? leftText.split(/\n\n+/) : [];
    const rightParas = rightText.trim() ? rightText.split(/\n\n+/) : [];
    const paragraphCount = Math.max(leftParas.length, rightParas.length);

    const countSentences = (para: string): number => {
      if (!para.trim()) return 0;
      const ends = para.match(/[.。!?！？]/g);
      return ends?.length ?? (para.trim() ? 1 : 0);
    };

    const leftSentenceCounts = leftParas.map(countSentences);
    const rightSentenceCounts = rightParas.map(countSentences);

    return { paragraphCount, leftSentenceCounts, rightSentenceCounts };
  }, [leftText, rightText]);

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

  // Open evidence panel when a citation is clicked in the editor
  useEffect(() => {
    const container = splitContainerRef.current;
    if (!container) return;

    const handleCiteClick = () => {
      setIsEvidencePanelOpen(true);
    };

    container.addEventListener("cite-click", handleCiteClick);
    return () => container.removeEventListener("cite-click", handleCiteClick);
  }, [splitContainerRef]);

  const [currentPhase, setCurrentPhase] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/v2/journey/${documentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.currentPhase) setCurrentPhase(data.currentPhase);
      })
      .catch(() => {});
  }, [documentId]);

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
  } = useSyncTranslation();

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

  const [cursorInfo, setCursorInfo] = useState<{
    panel: "left" | "right";
    paragraphIndex: number;
    sentenceInParagraph: number;
    globalSentenceIndex: number;
  } | null>(null);

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
      const pos = sentenceIndexToPosition(leftText, index);
      setCursorInfo({ panel: "left", ...pos, globalSentenceIndex: index });

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
    [setSentenceGroup, leftText],
  );

  const handleRightSentence = useCallback(
    (index: number) => {
      const pos = sentenceIndexToPosition(rightText, index);
      setCursorInfo({ panel: "right", ...pos, globalSentenceIndex: index });

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
    [setSentenceGroup, rightText],
  );

  const handleBlur = useCallback(() => {
    clearHighlight();
    setCursorInfo(null);
  }, [clearHighlight]);

  const handlePaste = useCallback(
    async (pastedText: string) => {
      try {
        const res = await fetch("/api/v2/detect-language", {
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

  const handleJourneyTaskClick = useCallback((task: TaskDefinition) => {
    if (task.linkedTab) {
      setActiveTab(task.linkedTab);
    }
  }, []);

  const handleCiteInsert = useCallback((sentenceIndex: number, citeCommand: string) => {
    setRightText(prev => {
      const sentences = prev.split(/(?<=[.!?])\s+/);
      if (sentenceIndex < sentences.length) {
        sentences[sentenceIndex] = sentences[sentenceIndex].trimEnd() + " " + citeCommand;
      }
      return sentences.join(" ");
    });
  }, []);

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
    <div className="flex h-screen overflow-hidden">
      {/* Journey Sidebar — hidden on mobile */}
      <div className="hidden md:flex shrink-0">
        <JourneySidebar
          documentId={documentId}
          onTaskClick={handleJourneyTaskClick}
          className="h-full"
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-secondary text-secondary-foreground shadow-md gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Link href="/dashboard" className="text-sm font-serif font-bold tracking-tight hover:opacity-80 transition-opacity hidden sm:inline">
            Unmute AI
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ArrowLeftIcon className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>マイペーパー</TooltipContent>
          </Tooltip>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleTitleKeyDown}
              className="text-base sm:text-lg font-semibold tracking-tight bg-transparent border-b border-secondary-foreground/40 outline-none px-1 min-w-[80px] max-w-[40vw] sm:max-w-none text-secondary-foreground"
            />
          ) : (
            <button
              onClick={handleStartTitleEdit}
              className="group/title flex items-center gap-1 text-base sm:text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity cursor-text min-w-0"
            >
              <span className="truncate max-w-[40vw] sm:max-w-none">{displayTitle}</span>
              <Pencil className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover/title:opacity-50 transition-opacity" />
            </button>
          )}
          {currentPhase && (
            <Badge variant="outline" className="text-xs shrink-0 border-secondary-foreground/30 text-secondary-foreground">
              Phase {currentPhase}/7
            </Badge>
          )}
          <TranslationStatus isTranslating={isSyncing} error={error} />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
          <PomodoroTimer documentId={documentId} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExportOpen(true)}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export manuscript</TooltipContent>
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
              <Link href={`/settings/preferences?returnTo=/papers/${documentId}`}>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>設定</TooltipContent>
          </Tooltip>
          {user && (
            <>
              <Separator orientation="vertical" className="h-6 bg-secondary-foreground/20 hidden sm:block" />
              <UserMenu user={user} role={user.role} />
            </>
          )}
        </div>
      </header>

      {/* Language bar */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 bg-card shadow-sm flex-wrap">
        <LanguageSelector value={leftLang} onChange={handleLeftLangChange} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwapLanguages}
              className="text-muted-foreground hover:text-foreground px-1.5 sm:px-3"
            >
              ⇄
            </Button>
          </TooltipTrigger>
          <TooltipContent>言語を入れ替え</TooltipContent>
        </Tooltip>
        <LanguageSelector value={rightLang} onChange={handleRightLangChange} />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <JournalSelector
          value={journal}
          onChange={setJournal}
          allowedJournalIds={planLimits?.allowedJournalIds}
        />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
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

      {/* Workflow tabs */}
      <WorkflowTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <SectionRail sections={sections} activeSection={activeSection} onSectionClick={setActiveSection} />

      {/* Write tab: Editor panels with sync buttons */}
      {activeTab === "write" && (
        <>
        <CoverageBar
          citationCount={citationCount}
          paragraphCount={textStats.paragraphCount}
          leftSentenceCounts={textStats.leftSentenceCounts}
          rightSentenceCounts={textStats.rightSentenceCounts}
          cursorInfo={cursorInfo}
          onOpenEvidence={() => setIsEvidencePanelOpen(true)}
          extra={
            <HighlightColorPicker
              citationColorId={citationColorId}
              sentenceColorId={sentenceColorId}
              citationColor={citationColor.color}
              sentenceColor={sentenceColor.color}
              onCitationColorChange={setCitationColor}
              onSentenceColorChange={setSentenceColor}
            />
          }
        />
        <div
          ref={splitContainerRef}
          className="flex flex-col md:flex-row flex-1 min-h-0"
          style={{
            "--citation-color": citationColor.color,
            "--sentence-color": sentenceColor.color,
          } as React.CSSProperties}
        >
          {/* Left panel (draft) - percentage width on desktop, full width on mobile */}
          <div
            className="flex-1 md:flex-none min-w-0 min-h-0 flex flex-col"
            style={{ width: `${splitRatio * 100}%` }}
          >
            <EditorPanel
              label="原文"
              content={leftText}
              onTextChange={handleLeftChange}
              onSentenceChange={handleLeftSentence}
              onBlur={handleBlur}
              onPaste={handlePaste}
              activeSentenceIndices={activeLeftIndices}
              sentenceRanges={sourceSentenceRanges}
              placeholder="ここに原文を入力..."
              containerRef={setLeftEditorRef}
            />
          </div>

          {/* Resizable splitter - desktop only */}
          <div
            className="hidden md:flex relative items-center justify-center select-none shrink-0"
            onMouseDown={handleSplitMouseDown}
            onTouchStart={handleSplitTouchStart}
            style={{ cursor: "col-resize", width: "1px" }}
          >
            {/* Invisible wider gutter for easier grabbing (16px hit area) */}
            <div className="absolute inset-y-0 -left-2 -right-2 z-10" />

            {/* Visible thin divider line */}
            <div className="w-px h-full bg-border" />

            {/* Center capsule handle with sync buttons */}
            <div className="absolute z-20 flex flex-col items-center gap-1">
              {/* Sync button: draft -> manuscript */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSyncLeftToRight(); }}
                    disabled={isSyncing || !leftText.trim()}
                    className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {syncingDirection === "left" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3 w-3" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  原文を翻訳に反映
                </TooltipContent>
              </Tooltip>

              {/* Capsule resize handle */}
              <div className="flex items-center justify-center w-6 h-10 rounded-full bg-gray-800 dark:bg-gray-600 text-white shadow-md pointer-events-none">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Sync button: manuscript -> draft */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSyncRightToLeft(); }}
                    disabled={isSyncing || !rightText.trim()}
                    className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {syncingDirection === "right" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ArrowLeft className="h-3 w-3" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  翻訳を原文に反映
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Mobile sync buttons - horizontal row */}
          <div className="flex md:hidden flex-row items-center justify-center gap-3 px-2 py-2 bg-muted/30 border-y">
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
                    <ArrowDown className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                原文を翻訳に反映
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
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                翻訳を原文に反映
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right panel (manuscript) - takes remaining space on desktop */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
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
              actions={
                <ParagraphActions
                  onFindCitations={() => setIsEvidencePanelOpen(true)}
                  onCheckEvidence={() => setIsEvidencePanelOpen(true)}
                  onDraftWithAI={() => setIsEvidencePanelOpen(true)}
                />
              }
            />
          </div>

          {/* Evidence side panel */}
          <EvidencePanel
            isOpen={isEvidencePanelOpen}
            onClose={() => {
              setIsEvidencePanelOpen(false);
              localStorage.setItem("unmute:evidence-panel-open", "false");
            }}
            documentId={documentId}
            draftText={rightText}
            onCiteInsert={handleCiteInsert}
          />
        </div>
        </>
      )}

      {/* Citations tab */}
      {activeTab === "citations" && (
        <CitationsView documentId={documentId} draftText={rightText} onCiteInsert={handleCiteInsert} />
      )}

      {/* Review tab */}
      {activeTab === "review" && (
        <ReviewView
          documentId={documentId}
          text={rightText}
          sectionType={activeSection ?? undefined}
        />
      )}

      {/* Export dialog */}
      <ExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        documentId={documentId}
        citationCount={citationCount}
        hasContent={rightText.trim().length > 0}
      />
      </div>{/* End main content wrapper */}

      {/* Mobile journey toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button
          variant="default"
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setMobileJourneyOpen(true)}
        >
          <Map className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile journey bottom sheet */}
      {mobileJourneyOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setMobileJourneyOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 h-[70vh] bg-background rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-semibold">Paper Writing Journey</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setMobileJourneyOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto h-full pb-20">
              <JourneySidebar
                documentId={documentId}
                onTaskClick={(task) => {
                  handleJourneyTaskClick(task);
                  setMobileJourneyOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
