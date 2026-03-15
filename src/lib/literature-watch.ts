import { prisma } from "@/lib/prisma";

interface WatchResult {
  title: string;
  authors: string;
  year: number | null;
  venue: string | null;
  doi: string | null;
  citationCount: number;
  source: string;
}

/**
 * Check for new papers matching a literature watch topic.
 * Uses the existing OpenAlex search via the evidence discover endpoint.
 */
export async function checkLiteratureWatch(
  watchId: string,
): Promise<WatchResult[]> {
  const watch = await prisma.literatureWatch.findUnique({
    where: { id: watchId },
  });

  if (!watch || !watch.enabled) return [];

  // Use OpenAlex API directly for simplicity
  const encodedQuery = encodeURIComponent(watch.query);
  const fromDate = watch.lastChecked
    ? watch.lastChecked.toISOString().split("T")[0]
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodedQuery}&filter=from_publication_date:${fromDate}&sort=publication_date:desc&per_page=10`,
    );

    if (!res.ok) return [];

    const data = await res.json();
    const results: WatchResult[] = (data.results ?? []).map((work: Record<string, unknown>) => ({
      title: (work.title as string) ?? "Untitled",
      authors: Array.isArray(work.authorships)
        ? (work.authorships as { author: { display_name: string } }[])
            .slice(0, 3)
            .map((a) => a.author.display_name)
            .join(", ")
        : "Unknown",
      year: (work.publication_year as number) ?? null,
      venue: (work.primary_location as { source?: { display_name?: string } } | null)?.source?.display_name ?? null,
      doi: (work.doi as string) ?? null,
      citationCount: (work.cited_by_count as number) ?? 0,
      source: "openalex",
    }));

    // Update watch
    await prisma.literatureWatch.update({
      where: { id: watchId },
      data: {
        lastChecked: new Date(),
        results: JSON.parse(JSON.stringify(results)),
      },
    });

    return results;
  } catch {
    return [];
  }
}
