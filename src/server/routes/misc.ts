import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateText, streamText } from "ai";
import { authMiddleware } from "@/server/middleware/auth";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { translationModel } from "@/lib/gemini";
import {
  buildTranslationPrompt,
  buildDetectLanguagePrompt,
  buildStructureCheckPrompt,
} from "@/lib/prompts";
import { getUserPlanById } from "@/lib/user-plan";
import {
  getUserAchievements,
  checkMilestoneAchievements,
} from "@/lib/achievements";
import { checkLiteratureWatch } from "@/lib/literature-watch";
import { translateWithGemini } from "@/lib/gemini-translate";
import {
  calculateCost,
  getTimeWindow,
  getBucketKey,
  generateAllBucketKeys,
  type Granularity,
} from "@/lib/analytics";
import {
  checkTranslationLimit,
  recordTranslationUsage,
  checkStructureCheckLimit,
  recordStructureCheckUsage,
  recordApiUsage,
} from "@/app/actions/usage";
import type {
  LanguageCode,
  DetectLanguageRequest,
  TranslationRequest,
  SentenceTranslationRequest,
  SentenceTranslationResponse,
  TranslationUsage,
  AlignmentGroup,
  StructureCheckResult,
} from "@/types";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string | null;
  };
};

// --- Detect-language valid codes ---
const validCodes: LanguageCode[] = [
  "ja", "en", "zh-CN", "zh-TW", "ko", "de", "fr",
  "es", "pt-BR", "ru", "it", "hi", "tr", "ar", "id", "pl", "fa",
];

const languageCodeSchema = z.enum([
  "ja", "en", "zh-CN", "zh-TW", "ko", "de", "fr",
  "es", "pt-BR", "ru", "it", "hi", "tr", "ar", "id", "pl", "fa",
]);

// --- Pageview constants ---
const LOCALES = new Set([
  "ja", "en", "zh-CN", "zh-TW", "ko", "de", "fr",
  "es", "pt-BR", "ru", "it", "hi", "tr", "ar", "id", "pl", "fa",
]);

const VISITOR_COOKIE = "um_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

function stripLocalePrefix(path: string): { normalizedPath: string; locale: string | null } {
  const match = path.match(/^\/([^/]+)(\/.*)?$/);
  if (match) {
    const firstSegment = match[1];
    if (LOCALES.has(firstSegment)) {
      return {
        normalizedPath: match[2] || "/",
        locale: firstSegment,
      };
    }
  }
  return { normalizedPath: path, locale: "ja" };
}

// --- Analytics constants ---
const VALID_GRANULARITIES = new Set<Granularity>([
  "hour",
  "day",
  "week",
  "month",
]);

// ============================================================
// Authenticated routes
// ============================================================

export const miscRoutes = new Hono<AuthEnv>()
  .use(authMiddleware)

  // GET /achievements
  .get("/achievements", async (c) => {
    const userId = c.get("userId");

    const newAchievements = await checkMilestoneAchievements(userId);
    const achievements = await getUserAchievements(userId);

    return c.json({ achievements, newAchievements });
  })

  // GET /literature-watch
  .get("/literature-watch", async (c) => {
    const userId = c.get("userId");

    const watches = await prisma.literatureWatch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ watches });
  })

  // POST /literature-watch
  .post(
    "/literature-watch",
    zValidator(
      "json",
      z.object({
        topic: z.string().min(1),
        query: z.string().min(1),
      }),
    ),
    async (c) => {
      const userId = c.get("userId");
      const { topic, query } = c.req.valid("json");

      const watch = await prisma.literatureWatch.create({
        data: {
          userId,
          topic,
          query,
        },
      });

      const results = await checkLiteratureWatch(watch.id);

      return c.json({ watch: { ...watch, results } });
    },
  )

  // POST /literature-watch/:id/check
  .post("/literature-watch/:id/check", async (c) => {
    const id = c.req.param("id");
    const results = await checkLiteratureWatch(id);
    return c.json({ results });
  })

  // GET /documents/:id/milestones
  .get("/documents/:id/milestones", async (c) => {
    const documentId = c.req.param("id");

    const milestones = await prisma.documentMilestone.findMany({
      where: { documentId },
      orderBy: { sortOrder: "asc" },
    });

    return c.json({ milestones });
  })

  // POST /documents/:id/milestones
  .post(
    "/documents/:id/milestones",
    zValidator(
      "json",
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.string().optional().default("CUSTOM"),
        targetDate: z.string(),
        sortOrder: z.number().optional().default(0),
      }),
    ),
    async (c) => {
      const documentId = c.req.param("id");
      const body = c.req.valid("json");

      const milestone = await prisma.documentMilestone.create({
        data: {
          documentId,
          title: body.title,
          description: body.description ?? null,
          type: body.type,
          targetDate: new Date(body.targetDate),
          sortOrder: body.sortOrder,
        },
      });

      return c.json(milestone);
    },
  )

  // GET /analytics/model-costs
  .get(
    "/analytics/model-costs",
    zValidator(
      "query",
      z.object({
        granularity: z.enum(["hour", "day", "week", "month"]).optional().default("day"),
      }),
    ),
    async (c) => {
      const userId = c.get("userId");
      const { granularity } = c.req.valid("query");

      if (!VALID_GRANULARITIES.has(granularity)) {
        return c.json({ error: "Invalid granularity" }, 400);
      }

      const since = getTimeWindow(granularity);

      const logs = await prisma.apiUsageLog.findMany({
        where: {
          userId,
          createdAt: { gte: since },
        },
        select: {
          model: true,
          inputTokens: true,
          outputTokens: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Aggregate by model
      const modelMap = new Map<
        string,
        {
          cost: number;
          requests: number;
          inputTokens: number;
          outputTokens: number;
          lastUsed: Date;
        }
      >();

      // Aggregate by time bucket
      const bucketMap = new Map<string, Record<string, number>>();

      for (const log of logs) {
        const cost = calculateCost(log.model, log.inputTokens, log.outputTokens);

        const existing = modelMap.get(log.model);
        if (existing) {
          existing.cost += cost;
          existing.requests += 1;
          existing.inputTokens += log.inputTokens;
          existing.outputTokens += log.outputTokens;
          existing.lastUsed = log.createdAt;
        } else {
          modelMap.set(log.model, {
            cost,
            requests: 1,
            inputTokens: log.inputTokens,
            outputTokens: log.outputTokens,
            lastUsed: log.createdAt,
          });
        }

        const bucketKey = getBucketKey(log.createdAt, granularity);
        const bucket = bucketMap.get(bucketKey) ?? {};
        bucket[log.model] = (bucket[log.model] ?? 0) + cost;
        bucketMap.set(bucketKey, bucket);
      }

      let totalCost = 0;
      const models = Array.from(modelMap.entries())
        .map(([model, data]) => {
          totalCost += data.cost;
          return {
            model,
            cost_usd: data.cost,
            request_count: data.requests,
            input_tokens: data.inputTokens,
            output_tokens: data.outputTokens,
            last_used_at: data.lastUsed.toISOString(),
          };
        })
        .sort((a, b) => b.cost_usd - a.cost_usd);

      const modelsWithShare = models.map((m) => ({
        ...m,
        share_percent: totalCost > 0 ? (m.cost_usd / totalCost) * 100 : 0,
      }));

      const topModel =
        modelsWithShare.length > 0
          ? {
              name: modelsWithShare[0].model,
              cost_usd: modelsWithShare[0].cost_usd,
              share_percent: modelsWithShare[0].share_percent,
            }
          : null;

      const allKeys = generateAllBucketKeys(since, granularity);
      const chart = allKeys.map((key) => {
        const values = bucketMap.get(key) ?? {};
        return {
          bucket_label: key,
          total_cost_usd: Object.values(values).reduce((sum, v) => sum + v, 0),
          values,
        };
      });

      return c.json({
        summary: {
          total_cost_usd: totalCost,
          top_model: topModel,
          granularity,
        },
        chart,
        models: modelsWithShare,
      });
    },
  )

  // POST /check-structure
  .post(
    "/check-structure",
    zValidator(
      "json",
      z.object({
        text: z.string().min(1),
        lang: languageCodeSchema,
      }),
    ),
    async (c) => {
      const userId = c.get("userId");
      const { text, lang } = c.req.valid("json");

      const { plan } = await getUserPlanById(userId);
      const limitCheck = await checkStructureCheckLimit(userId, plan);
      if (!limitCheck.allowed) {
        return c.json(
          {
            error: "構成チェックの上限に達しました",
            code: "STRUCTURE_CHECK_LIMIT",
            remaining: limitCheck.remaining,
          },
          429,
        );
      }

      const { text: result, usage } = await generateText({
        model: translationModel,
        system: buildStructureCheckPrompt(lang),
        prompt: text,
      });

      await recordStructureCheckUsage(userId);

      await recordApiUsage({
        userId,
        type: "structure_check",
        model: "gemini-2.5-flash",
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        sourceChars: text.length,
      });

      try {
        const cleaned = result
          .replace(/^```(?:json)?\s*\n?/i, "")
          .replace(/\n?```\s*$/i, "")
          .trim();
        const parsed = JSON.parse(cleaned) as StructureCheckResult;
        return c.json(parsed);
      } catch {
        return c.json(
          { error: "Failed to parse structure check result", raw: result },
          500,
        );
      }
    },
  )

  // POST /translate-sentence
  .post(
    "/translate-sentence",
    zValidator(
      "json",
      z.object({
        sentences: z.array(z.string()),
        sourceLang: languageCodeSchema,
        targetLang: languageCodeSchema,
        journal: z.string().optional(),
      }),
    ),
    async (c) => {
      try {
        const userId = c.get("userId");
        const { sentences, sourceLang, targetLang, journal } = c.req.valid("json");

        if (sourceLang === targetLang) {
          return c.json(
            { error: "原文と翻訳の言語が同じです。言語設定を確認してください。" },
            400,
          );
        }

        const { plan } = await getUserPlanById(userId);

        // Filter out empty sentences, keep track of indices
        const nonEmptyIndices: number[] = [];
        const textsToTranslate: string[] = [];

        for (let i = 0; i < sentences.length; i++) {
          if (sentences[i].trim()) {
            nonEmptyIndices.push(i);
            textsToTranslate.push(sentences[i]);
          }
        }

        const totalChars = textsToTranslate.reduce(
          (sum, t) => sum + t.length,
          0,
        );
        const limitCheck = await checkTranslationLimit(userId, plan, totalChars);
        if (!limitCheck.allowed) {
          return c.json(
            {
              error: "翻訳文字数の上限に達しました",
              code: "TRANSLATION_LIMIT",
              remaining: limitCheck.remaining,
            },
            429,
          );
        }

        let translated: string[] = [];
        let alignment: AlignmentGroup[] = [];
        let usage: TranslationUsage | undefined;

        if (textsToTranslate.length > 0) {
          const result = await translateWithGemini({
            texts: textsToTranslate,
            sourceLang,
            targetLang,
            journalId: journal,
          });
          translated = result.translations;
          alignment = result.alignment;
          usage = {
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          };

          await recordTranslationUsage(userId, totalChars);

          const translatedChars = translated.reduce(
            (sum, t) => sum + t.length,
            0,
          );
          await recordApiUsage({
            userId,
            type: "translation",
            model: "gemini-2.5-flash",
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            sourceChars: totalChars,
            translatedChars,
            sourceLang,
            targetLang,
          });
        }

        // Remap alignment indices from filtered space to original space
        const remappedAlignment: AlignmentGroup[] = alignment.map((group) => ({
          left: group.left.map((i) =>
            i < nonEmptyIndices.length ? nonEmptyIndices[i] : i,
          ),
          right: group.right,
        }));

        return c.json({
          translations: translated,
          alignment: remappedAlignment,
          usage,
        } satisfies SentenceTranslationResponse);
      } catch (error) {
        console.error("Sentence translation error:", error);
        return c.json(
          { error: error instanceof Error ? error.message : "Translation failed" },
          500,
        );
      }
    },
  )

  // POST /user/dismiss-welcome
  .post("/user/dismiss-welcome", async (c) => {
    const userId = c.get("userId");

    await prisma.user.update({
      where: { id: userId },
      data: { hasSeenWelcome: true },
    });

    return c.body(null, 204);
  });

// ============================================================
// Unauthenticated / special-auth routes
// These are mounted separately since they don't use authMiddleware.
// ============================================================

export const publicMiscRoutes = new Hono()

  // POST /detect-language (no auth required)
  .post(
    "/detect-language",
    zValidator(
      "json",
      z.object({
        text: z.string().optional(),
      }),
    ),
    async (c) => {
      const { text } = c.req.valid("json");

      if (!text?.trim()) {
        return c.json({ language: "en" });
      }

      const sample = text.slice(0, 200);

      const { text: detected } = await generateText({
        model: translationModel,
        system: buildDetectLanguagePrompt(),
        prompt: sample,
      });

      let code = detected.trim().toLowerCase();

      if (code === "zh") code = "zh-CN";
      if (code === "pt") code = "pt-BR";

      const language = validCodes.includes(code as LanguageCode)
        ? (code as LanguageCode)
        : "en";

      return c.json({ language });
    },
  )

  // POST /translate (no auth required - streaming)
  .post(
    "/translate",
    zValidator(
      "json",
      z.object({
        text: z.string(),
        sourceLang: languageCodeSchema,
        targetLang: languageCodeSchema,
        journal: z.string().optional(),
      }),
    ),
    async (c) => {
      const { text, sourceLang, targetLang, journal } = c.req.valid("json");

      if (!text?.trim()) {
        return new Response("", { status: 200 });
      }

      const systemPrompt = buildTranslationPrompt(sourceLang, targetLang, journal);

      const result = streamText({
        model: translationModel,
        system: systemPrompt,
        prompt: text,
      });

      return result.toTextStreamResponse();
    },
  )

  // POST /analytics/pageviews (special auth - uses cookies, partially authed)
  .post(
    "/analytics/pageviews",
    zValidator(
      "json",
      z.object({
        path: z.string().min(1),
      }),
    ),
    async (c) => {
      const { path: rawPath } = c.req.valid("json");

      const { normalizedPath, locale } = stripLocalePrefix(rawPath);

      // Visitor identification via cookie
      const cookieHeader = c.req.header("cookie") ?? "";
      const cookies = Object.fromEntries(
        cookieHeader.split(";").map((c) => {
          const [key, ...rest] = c.trim().split("=");
          return [key, rest.join("=")];
        }),
      );
      let visitorId = cookies[VISITOR_COOKIE] ?? "";
      const isNewVisitor = !visitorId;
      if (isNewVisitor) {
        visitorId = crypto.randomUUID();
      }

      // Authenticated user (optional)
      let userId: string | null = null;
      try {
        const session = await auth();
        userId = session?.user?.id ?? null;
      } catch {
        // Auth failure should not block tracking
      }

      // Country code from Vercel edge header
      const countryCode =
        c.req.header("x-vercel-ip-country")?.toUpperCase().slice(0, 2) ?? null;

      await prisma.pageView.create({
        data: {
          visitorId,
          userId,
          path: normalizedPath,
          locale,
          countryCode,
        },
      });

      // Build response (204 No Content)
      const headers: Record<string, string> = {};

      if (isNewVisitor) {
        const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
        headers["Set-Cookie"] =
          `${VISITOR_COOKIE}=${visitorId}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${COOKIE_MAX_AGE}`;
      }

      return c.body(null, 204, headers);
    },
  );
