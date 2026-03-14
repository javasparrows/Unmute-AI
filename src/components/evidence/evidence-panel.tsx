"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Library, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidenceSearch } from "./evidence-search";
import { EvidenceLibrary } from "./evidence-library";
import { EvidenceReview } from "./evidence-review";

interface EvidencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

type TabId = "search" | "library" | "review";

const TABS = [
  { id: "search" as const, label: "Search", icon: Search },
  { id: "library" as const, label: "Library", icon: Library },
  { id: "review" as const, label: "Review", icon: ShieldCheck },
] as const;

export function EvidencePanel({ isOpen, onClose, documentId }: EvidencePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("search");

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
    <div className="w-[380px] border-l bg-background flex flex-col h-full shrink-0">
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
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "search" && <EvidenceSearch documentId={documentId} />}
        {activeTab === "library" && <EvidenceLibrary documentId={documentId} />}
        {activeTab === "review" && <EvidenceReview documentId={documentId} />}
      </div>
    </div>
  );
}
