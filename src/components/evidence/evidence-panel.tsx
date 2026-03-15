"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Library, ShieldCheck, Zap, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidenceSearch } from "./evidence-search";
import { EvidenceLibrary } from "./evidence-library";
import { EvidenceReview } from "./evidence-review";
import { CitationAutopilot } from "./citation-autopilot";

interface EvidencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

type TabId = "search" | "library" | "review" | "autopilot";
type PanelWidth = "normal" | "wide";

const STORAGE_KEY_WIDTH = "unmute:evidence-panel-width";

const TABS = [
  { id: "search" as const, label: "Search", icon: Search },
  { id: "library" as const, label: "Library", icon: Library },
  { id: "review" as const, label: "Review", icon: ShieldCheck },
  { id: "autopilot" as const, label: "Auto-Pilot", icon: Zap },
] as const;

export function EvidencePanel({ isOpen, onClose, documentId }: EvidencePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [panelWidth, setPanelWidth] = useState<PanelWidth>(() => {
    if (typeof window === "undefined") return "normal";
    const saved = localStorage.getItem(STORAGE_KEY_WIDTH);
    return saved === "wide" ? "wide" : "normal";
  });

  const toggleWidth = useCallback(() => {
    setPanelWidth((prev) => {
      const next = prev === "normal" ? "wide" : "normal";
      localStorage.setItem(STORAGE_KEY_WIDTH, next);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className={`${panelWidth === "wide" ? "md:w-[600px]" : "md:w-[380px]"} fixed inset-0 z-50 md:relative md:inset-auto md:z-auto w-full border-l bg-background flex flex-col h-full shrink-0 transition-[width] duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="gap-1.5 text-xs"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={toggleWidth} className="h-7 w-7">
            {panelWidth === "wide" ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "search" && <EvidenceSearch documentId={documentId} />}
        {activeTab === "library" && <EvidenceLibrary documentId={documentId} />}
        {activeTab === "review" && <EvidenceReview documentId={documentId} />}
        {activeTab === "autopilot" && (
          <CitationAutopilot
            documentId={documentId}
            draftText="" // TODO: Connect to editor text
            section="INTRODUCTION"
          />
        )}
      </div>
    </div>
  );
}
