// Model pricing rates (USD per 1M tokens)
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
};

const DEFAULT_RATE = { input: 0.15, output: 0.60 };

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = MODEL_RATES[model] ?? DEFAULT_RATE;
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}

export type Granularity = "hour" | "day" | "week" | "month";

export function getTimeWindow(granularity: Granularity): Date {
  const now = new Date();
  switch (granularity) {
    case "hour":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "day":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "week":
      return new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getFullYear() - 1, now.getMonth(), 1);
  }
}

export function getBucketKey(date: Date, granularity: Granularity): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  switch (granularity) {
    case "hour":
      return `${jst.getUTCHours()}:00`;
    case "day":
      return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`;
    case "week": {
      // ISO week start (Monday)
      const day = jst.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(jst.getTime() + diff * 24 * 60 * 60 * 1000);
      return `${monday.getUTCMonth() + 1}/${monday.getUTCDate()}~`;
    }
    case "month":
      return `${jst.getUTCFullYear()}/${jst.getUTCMonth() + 1}`;
  }
}

export function generateAllBucketKeys(
  since: Date,
  granularity: Granularity,
): string[] {
  const now = new Date();
  const keys: string[] = [];

  switch (granularity) {
    case "hour": {
      for (let h = 0; h < 24; h++) {
        keys.push(`${h}:00`);
      }
      break;
    }
    case "day": {
      const cursor = new Date(since);
      while (cursor <= now) {
        keys.push(getBucketKey(cursor, "day"));
        cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
      }
      break;
    }
    case "week": {
      const cursor = new Date(since);
      // Align to Monday
      const day = cursor.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      cursor.setTime(cursor.getTime() + diff * 24 * 60 * 60 * 1000);
      while (cursor <= now) {
        keys.push(getBucketKey(cursor, "week"));
        cursor.setTime(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      break;
    }
    case "month": {
      const cursor = new Date(since.getFullYear(), since.getMonth(), 1);
      while (cursor <= now) {
        keys.push(getBucketKey(cursor, "month"));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      break;
    }
  }

  return keys;
}
