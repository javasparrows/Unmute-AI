"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PaperCandidate } from "@/types/evidence";

interface PaperCardProps {
  paper: PaperCandidate;
  documentId: string;
}

type VerifyStatus = "unverified" | "verifying" | "verified" | "failed";

export function PaperCard({ paper, documentId }: PaperCardProps) {
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("unverified");
  const [verifiedPaperId, setVerifiedPaperId] = useState<string | null>(null);

  async function handleVerify() {
    setVerifyStatus("verifying");
    try {
      const res = await fetch("/api/evidence/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate: paper }),
      });
      const data = await res.json();
      if (data.paper?.verified) {
        setVerifyStatus("verified");
        setVerifiedPaperId(data.paper.id);
      } else {
        setVerifyStatus("failed");
      }
    } catch {
      setVerifyStatus("failed");
    }
  }

  async function handleAddToLibrary() {
    if (!verifiedPaperId) return;
    try {
      await fetch(`/api/evidence/library/${documentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: verifiedPaperId }),
      });
      // TODO: Add ManuscriptCitation record and show success feedback
    } catch {
      // Handle error
    }
  }

  const authors = paper.authors?.slice(0, 3).map((a) => a.name).join(", ");
  const hasMoreAuthors = (paper.authors?.length ?? 0) > 3;

  return (
    <Card className="border shadow-none">
      <CardHeader className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
            {paper.title}
          </CardTitle>
          {verifyStatus === "verified" && (
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          )}
          {verifyStatus === "failed" && (
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          )}
        </div>

        <CardDescription className="text-xs">
          {authors}
          {hasMoreAuthors ? " et al." : ""} {paper.year && `(${paper.year})`}
        </CardDescription>

        {paper.venue && (
          <p className="text-xs text-muted-foreground italic">{paper.venue}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {paper.citationCount != null && (
            <Badge variant="secondary" className="text-xs">
              {paper.citationCount} citations
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {paper.source}
          </Badge>
          {paper.externalIds.doi && (
            <Badge variant="outline" className="text-xs">
              DOI
            </Badge>
          )}
        </div>

        {/* Abstract preview */}
        {paper.abstract && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {paper.abstract}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {verifyStatus === "unverified" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerify}
              className="text-xs h-7"
            >
              Verify
            </Button>
          )}
          {verifyStatus === "verifying" && (
            <Button size="sm" variant="outline" disabled className="text-xs h-7">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Verifying...
            </Button>
          )}
          {verifyStatus === "verified" && (
            <Button
              size="sm"
              onClick={handleAddToLibrary}
              className="text-xs h-7 gap-1"
            >
              <Plus className="h-3 w-3" />
              Add to Library
            </Button>
          )}
          {verifyStatus === "failed" && (
            <span className="text-xs text-red-500">Verification failed</span>
          )}
          {paper.externalIds.doi && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7"
              onClick={() =>
                window.open(
                  `https://doi.org/${paper.externalIds.doi}`,
                  "_blank",
                )
              }
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
