import type { Plan } from "@/generated/prisma/client";

export interface PlanLimits {
  translationCharsPerMonth: number; // -1 = unlimited
  maxDocuments: number; // -1 = unlimited
  maxVersionsPerDoc: number; // -1 = unlimited
  structureChecksPerMonth: number; // -1 = unlimited
  allowedJournalIds: string[] | "all";
}

export interface PlanInfo {
  id: Plan;
  name: string;
  price: number; // monthly JPY, 0 for free
  description: string;
  limits: PlanLimits;
  stripePriceId: string | null;
  features: string[];
}

export const PLANS: Record<Plan, PlanInfo> = {
  FREE: {
    id: "FREE",
    name: "Free",
    price: 0,
    description: "論文執筆の基本機能を無料で",
    stripePriceId: null,
    limits: {
      translationCharsPerMonth: 10_000,
      maxDocuments: 3,
      maxVersionsPerDoc: 5,
      structureChecksPerMonth: 3,
      allowedJournalIds: ["general"],
    },
    features: [
      "月10,000文字のAI執筆支援",
      "最大3ドキュメント",
      "バージョン5個/ドキュメント",
      "Gemini 2.5 Flash",
      "General Academicスタイル",
      "月3回の構成チェック",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 980,
    description: "研究者向けの充実した執筆環境",
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    limits: {
      translationCharsPerMonth: 100_000,
      maxDocuments: 20,
      maxVersionsPerDoc: 50,
      structureChecksPerMonth: 30,
      allowedJournalIds: "all",
    },
    features: [
      "月100,000文字のAI執筆支援",
      "最大20ドキュメント",
      "バージョン50個/ドキュメント",
      "Gemini 2.5 Flash",
      "全8種ジャーナルスタイル",
      "月30回の構成チェック",
    ],
  },
  MAX: {
    id: "MAX",
    name: "Max",
    price: 2_980,
    description: "無制限の執筆・全機能アクセス",
    stripePriceId: process.env.STRIPE_MAX_PRICE_ID ?? null,
    limits: {
      translationCharsPerMonth: -1,
      maxDocuments: -1,
      maxVersionsPerDoc: -1,
      structureChecksPerMonth: -1,
      allowedJournalIds: "all",
    },
    features: [
      "無制限のAI執筆支援",
      "無制限のドキュメント",
      "無制限のバージョン",
      "Gemini 2.5 Flash",
      "全8種ジャーナルスタイル",
      "無制限の構成チェック",
    ],
  },
};

export function getPlanInfo(plan: Plan): PlanInfo {
  return PLANS[plan];
}

export function getPlanByPriceId(priceId: string): PlanInfo | undefined {
  return Object.values(PLANS).find((p) => p.stripePriceId === priceId);
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}
