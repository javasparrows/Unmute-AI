"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  MapPin,
  RefreshCw,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EvidenceMapping {
  id: string;
  manuscriptSentence: string;
  sentenceIndex: number;
  sectionType: string | null;
  supportingPassage: string;
  citedPaperSection: string | null;
  citedPaperPage: number | null;
  confidence: number;
  mappingRationale: string | null;
  screenshotUrl: string | null;
  humanVerified: boolean;
  verificationStatus: string;
  verificationNote: string | null;
  manuscriptCitation: {
    citeKey: string | null;
    paper: {
      id: string;
      title: string;
      authors: unknown;
      year: number | null;
      venue: string | null;
      identifiers: { provider: string; externalId: string }[];
    };
  };
}

interface EvidenceMappingPanelProps {
  documentId: string;
  draftText: string;
}

export function EvidenceMappingPanel({ documentId, draftText }: EvidenceMappingPanelProps) {
  const [mappings, setMappings] = useState<EvidenceMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [mappingInProgress, setMappingInProgress] = useState(false);

  const fetchMappings = useCallback(async () => {
    try {
      const res = await fetch(`/api/v2/evidence/mappings?documentId=${documentId}`);
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const handleMapAll = async () => {
    setMappingInProgress(true);

    // Find all \cite{key} in the text and map each one
    const sentences = draftText.split(/(?<=[.!?])\s+/);
    const citeSentences = sentences
      .map((s, i) => ({ text: s, index: i }))
      .filter((s) => /\\cite\{[^}]+\}/.test(s.text));

    // Get all citations for this document
    const citationsRes = await fetch(`/api/v2/evidence/library?documentId=${documentId}`);
    if (!citationsRes.ok) {
      setMappingInProgress(false);
      return;
    }
    const citationsData = await citationsRes.json();
    const citations = citationsData.citations as { id: string; citeKey: string | null }[];

    for (const sentence of citeSentences) {
      // Find which citation this sentence references
      const citeMatch = sentence.text.match(/\\cite\{([^}]+)\}/);
      if (!citeMatch) continue;
      const citeKey = citeMatch[1];

      const citation = citations.find((c) => c.citeKey === citeKey);
      if (!citation) continue;

      // Check if already mapped
      const alreadyMapped = mappings.some(
        (m) => m.manuscriptCitation.citeKey === citeKey && m.sentenceIndex === sentence.index,
      );
      if (alreadyMapped) continue;

      try {
        await fetch("/api/v2/evidence/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            manuscriptCitationId: citation.id,
            sentenceIndex: sentence.index,
            manuscriptSentence: sentence.text,
          }),
        });
      } catch {
        // Continue with other sentences
      }
    }

    await fetchMappings();
    setMappingInProgress(false);
  };

  const handleVerify = async (mappingId: string, verified: boolean, note?: string) => {
    try {
      const res = await fetch("/api/v2/evidence/verify-human", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId, verified, note }),
      });
      if (res.ok) {
        await fetchMappings();
      }
    } catch {
      // Silently fail
    }
  };

  const verifiedCount = mappings.filter((m) => m.humanVerified).length;
  const totalCount = mappings.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Evidence Mapping</span>
          {totalCount > 0 && (
            <Badge variant={verifiedCount === totalCount ? "default" : "secondary"} className="text-xs">
              {verifiedCount}/{totalCount} verified
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleMapAll}
            disabled={mappingInProgress || !draftText.trim()}
          >
            {mappingInProgress ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Mapping...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Map all citations
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mapping List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              No evidence mappings yet
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Use &ldquo;Map all citations&rdquo; to automatically locate supporting passages for each citation
            </p>
            <Button
              onClick={handleMapAll}
              disabled={mappingInProgress || !draftText.trim()}
              size="sm"
            >
              Start mapping
            </Button>
          </div>
        ) : (
          mappings.map((mapping) => (
            <EvidenceMappingCard
              key={mapping.id}
              mapping={mapping}
              onVerify={handleVerify}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EvidenceMappingCard({
  mapping,
  onVerify,
}: {
  mapping: EvidenceMapping;
  onVerify: (id: string, verified: boolean, note?: string) => Promise<void>;
}) {
  const [verifyNote, setVerifyNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const authors = Array.isArray(mapping.manuscriptCitation.paper.authors)
    ? (mapping.manuscriptCitation.paper.authors as { name: string }[])
    : [];
  const firstAuthor = authors[0]?.name?.split(/\s+/).pop() ?? "Unknown";
  const etAl = authors.length > 1 ? " et al." : "";
  const year = mapping.manuscriptCitation.paper.year ?? "n.d.";
  const doi = mapping.manuscriptCitation.paper.identifiers.find(
    (i) => i.provider === "crossref",
  )?.externalId;

  const confidenceColor =
    mapping.confidence >= 0.7
      ? "text-green-600"
      : mapping.confidence >= 0.4
        ? "text-amber-600"
        : "text-red-600";

  const statusIcon = {
    verified: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    rejected: <XCircle className="h-4 w-4 text-red-500" />,
    pending: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    needs_revision: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  }[mapping.verificationStatus] ?? <AlertTriangle className="h-4 w-4 text-amber-500" />;

  const handleVerify = async (verified: boolean) => {
    setVerifying(true);
    await onVerify(mapping.id, verified, verifyNote || undefined);
    setVerifying(false);
    setShowNote(false);
  };

  return (
    <Card className={cn(
      "border",
      mapping.verificationStatus === "verified" && "border-green-200 dark:border-green-900",
      mapping.verificationStatus === "rejected" && "border-red-200 dark:border-red-900",
    )}>
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2">
            {statusIcon}
            <span>{firstAuthor}{etAl} ({year})</span>
            <Badge variant="outline" className="text-xs">
              {mapping.manuscriptCitation.citeKey}
            </Badge>
          </CardTitle>
          <Badge variant="secondary" className={cn("text-xs", confidenceColor)}>
            {(mapping.confidence * 100).toFixed(0)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Manuscript sentence */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Manuscript claim:</p>
          <p className="text-sm bg-muted/50 rounded p-2 italic">
            &ldquo;{mapping.manuscriptSentence}&rdquo;
          </p>
        </div>

        {/* Supporting passage */}
        <div>
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            Supporting passage:
            {mapping.citedPaperSection && (
              <Badge variant="outline" className="text-xs">{mapping.citedPaperSection}</Badge>
            )}
            {mapping.citedPaperPage && (
              <span className="text-xs">p.{mapping.citedPaperPage}</span>
            )}
          </p>
          <p className="text-sm bg-green-50 dark:bg-green-950/20 rounded p-2 border border-green-200 dark:border-green-900">
            &ldquo;{mapping.supportingPassage}&rdquo;
          </p>
        </div>

        {/* Rationale */}
        {mapping.mappingRationale && (
          <p className="text-xs text-muted-foreground">
            {mapping.mappingRationale}
          </p>
        )}

        {/* DOI link */}
        {doi && (
          <a
            href={`https://doi.org/${doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            doi:{doi}
          </a>
        )}

        {/* PDF link */}
        {mapping.screenshotUrl && (
          <a
            href={mapping.screenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            <FileText className="h-3 w-3" />
            PDFで確認 {mapping.citedPaperPage && `(p.${mapping.citedPaperPage})`}
          </a>
        )}

        {/* Verification controls */}
        {mapping.verificationStatus === "pending" && (
          <div className="space-y-2 pt-1 border-t">
            {showNote && (
              <Textarea
                placeholder="Verification note (optional)"
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                className="text-xs h-16"
              />
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="text-xs gap-1 flex-1"
                onClick={() => handleVerify(true)}
                disabled={verifying}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={() => handleVerify(false)}
                disabled={verifying}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
              {!showNote && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setShowNote(true)}
                >
                  Note
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Already verified */}
        {mapping.verificationStatus === "verified" && (
          <div className="flex items-center gap-2 pt-1 border-t text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified
            {mapping.verificationNote && (
              <span className="text-muted-foreground">-- {mapping.verificationNote}</span>
            )}
          </div>
        )}

        {mapping.verificationStatus === "rejected" && (
          <div className="flex items-center gap-2 pt-1 border-t text-xs text-red-500">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
            {mapping.verificationNote && (
              <span className="text-muted-foreground">-- {mapping.verificationNote}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
