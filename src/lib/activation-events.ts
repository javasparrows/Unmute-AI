/**
 * Lightweight activation event tracking.
 * Records key user milestones for measuring product activation.
 * Events are sent fire-and-forget to avoid blocking the UI.
 */

export type ActivationEvent =
  | "paper_created"
  | "first_citation_search"
  | "first_citation_inserted"
  | "first_evidence_panel_opened"
  | "first_structure_check"
  | "first_export"
  | "upgrade_clicked";

export function trackActivation(event: ActivationEvent, metadata?: Record<string, string>): void {
  fetch("/api/analytics/activation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, metadata, timestamp: new Date().toISOString() }),
  }).catch(() => {
    // Fire-and-forget: silently ignore errors
  });
}
