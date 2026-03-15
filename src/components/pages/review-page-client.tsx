"use client";

import { ArrowLeftIcon, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ReviewView } from "@/components/editor/review-view";

interface ReviewPageClientProps {
  documentId: string;
  documentTitle: string;
  draftText: string;
}

export function ReviewPageClient({
  documentId,
  documentTitle,
  draftText,
}: ReviewPageClientProps) {
  return (
    <>
      <div className="border-b px-6 py-3 flex items-center gap-3">
        <Link href={`/papers/${documentId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-sm font-semibold">{documentTitle}</h1>
          <p className="text-xs text-muted-foreground">Review & Compliance</p>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ReviewView documentId={documentId} text={draftText} />
      </div>
    </>
  );
}
