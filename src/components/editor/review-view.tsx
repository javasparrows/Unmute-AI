"use client";

import { FlowAnalysisPanel } from "./flow-analysis-panel";
import { CompliancePanel } from "./compliance-panel";
import { SubmissionPlanPanel } from "./submission-plan-panel";

interface ReviewViewProps {
  documentId: string;
  text: string;
  sectionType?: string;
}

export function ReviewView({ documentId, text, sectionType }: ReviewViewProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <FlowAnalysisPanel
        documentId={documentId}
        text={text}
        sectionType={sectionType}
      />
      <div className="border-t my-4" />
      <CompliancePanel documentId={documentId} text={text} />
      <div className="border-t my-4" />
      <SubmissionPlanPanel documentId={documentId} />
    </div>
  );
}
