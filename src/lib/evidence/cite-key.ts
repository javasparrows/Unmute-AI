/**
 * Generate a cite key from paper metadata.
 * Format: firstAuthorLastName + year + firstSignificantWordOfTitle
 * Example: "vaswani2017attention", "ronneberger2015unet"
 */
export function generateCiteKey(
  authors: { name: string }[],
  year: number | null | undefined,
  title: string,
  existingKeys: Set<string> = new Set()
): string {
  // Extract first author's last name
  const firstAuthor = authors[0]?.name ?? "unknown";
  const lastName = extractLastName(firstAuthor)
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  // Year
  const yearStr = year?.toString() ?? "nd";

  // First significant word of title (skip common words)
  const titleWord = extractFirstSignificantWord(title);

  // Base key
  const key = `${lastName}${yearStr}${titleWord}`;

  // Handle duplicates
  if (!existingKeys.has(key)) return key;

  // Append a, b, c...
  for (let i = 0; i < 26; i++) {
    const suffix = String.fromCharCode(97 + i); // a, b, c...
    const candidate = `${key}${suffix}`;
    if (!existingKeys.has(candidate)) return candidate;
  }

  // Fallback: append random
  return `${key}_${Date.now().toString(36).slice(-4)}`;
}

function extractLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  // Handle "Last, First" format
  if (parts[0]?.endsWith(",")) return parts[0].replace(",", "");
  // Handle "First Last" format
  return parts[parts.length - 1] ?? "unknown";
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "and",
  "or",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "with",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "over",
  "about",
  "against",
  "how",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "do",
  "does",
  "did",
  "has",
  "have",
  "had",
  "not",
  "but",
  "if",
  "so",
  "no",
  "nor",
  "too",
  "very",
  "can",
  "will",
  "just",
  "should",
  "now",
  "new",
  "using",
  "based",
  "via",
  "towards",
]);

function extractFirstSignificantWord(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/);
  for (const word of words) {
    if (word.length > 2 && !STOP_WORDS.has(word)) return word;
  }
  return words[0] ?? "paper";
}
