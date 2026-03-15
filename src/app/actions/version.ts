"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getUserPlanById } from "@/lib/user-plan";
import { checkVersionLimit } from "@/app/actions/usage";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

async function verifyDocumentOwnership(documentId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId, userId },
    select: { id: true },
  });
  if (!doc) throw new Error("Document not found");
}

export async function saveVersion(data: {
  documentId: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  journal?: string;
  provider?: string;
  leftRanges?: { from: number; to: number }[];
  rightRanges?: { from: number; to: number }[];
  sentenceAlignments?: { left: number[]; right: number[] }[];
  sections?: Record<string, unknown>;
}) {
  const userId = await getUserId();
  await verifyDocumentOwnership(data.documentId, userId);

  const { plan } = await getUserPlanById(userId);
  const limitCheck = await checkVersionLimit(userId, plan, data.documentId);
  if (!limitCheck.allowed) {
    throw new Error(
      `バージョン数の上限（${limitCheck.max}個）に達しました。プランをアップグレードしてください。`,
    );
  }

  const lastVersion = await prisma.documentVersion.findFirst({
    where: { documentId: data.documentId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  const version = await prisma.documentVersion.create({
    data: {
      documentId: data.documentId,
      versionNumber: nextVersionNumber,
      sourceText: data.sourceText,
      translatedText: data.translatedText,
      sourceLang: data.sourceLang,
      targetLang: data.targetLang,
      journal: data.journal,
      provider: data.provider,
      leftRanges: data.leftRanges
        ? (data.leftRanges as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      rightRanges: data.rightRanges
        ? (data.rightRanges as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      sentenceAlignments: data.sentenceAlignments
        ? (data.sentenceAlignments as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      sections: data.sections
        ? (data.sections as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  await prisma.document.update({
    where: { id: data.documentId },
    data: { updatedAt: new Date() },
  });

  return { versionNumber: version.versionNumber };
}

export async function getVersions(documentId: string) {
  const userId = await getUserId();
  await verifyDocumentOwnership(documentId, userId);

  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      createdAt: true,
      sourceLang: true,
      targetLang: true,
    },
  });
}

export async function getVersion(documentId: string, versionNumber: number) {
  const userId = await getUserId();
  await verifyDocumentOwnership(documentId, userId);

  return prisma.documentVersion.findUnique({
    where: {
      documentId_versionNumber: { documentId, versionNumber },
    },
  });
}
