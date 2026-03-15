"use client";

import { cn } from "@/lib/utils";
import type { DocumentSectionMeta, SectionType } from "@/lib/sections";
import { getSectionLabel } from "@/lib/sections";

interface SectionRailProps {
  sections: DocumentSectionMeta;
  activeSection: SectionType | null;
  onSectionClick: (sectionType: SectionType) => void;
}

export function SectionRail({ sections, activeSection, onSectionClick }: SectionRailProps) {
  if (sections.items.length <= 1 && sections.items[0]?.type === "OTHER") {
    return null; // Don't show rail for unsectioned documents
  }

  return (
    <div className="flex gap-1 overflow-x-auto border-b bg-muted/30 px-4 py-1.5">
      {sections.items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSectionClick(item.type)}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors",
            activeSection === item.type
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {getSectionLabel(item.type)}
        </button>
      ))}
    </div>
  );
}
