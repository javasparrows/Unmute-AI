"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getUserPlanById } from "@/lib/user-plan";
import { checkDocumentLimit } from "@/app/actions/usage";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getDocuments() {
  const userId = await getUserId();
  return prisma.document.findMany({
    where: { userId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { versionNumber: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createDocument() {
  const userId = await getUserId();
  const { plan } = await getUserPlanById(userId);
  const limitCheck = await checkDocumentLimit(userId, plan);
  if (!limitCheck.allowed) {
    throw new Error(
      `ドキュメント数の上限（${limitCheck.max}件）に達しました。プランをアップグレードしてください。`,
    );
  }

  const doc = await prisma.document.create({
    data: {
      userId,
      versions: {
        create: {
          versionNumber: 1,
          sourceText: "",
          translatedText: "",
          sourceLang: "ja",
          targetLang: "en",
        },
      },
    },
  });
  redirect(`/documents/${doc.id}`);
}

export async function deleteDocument(documentId: string) {
  const userId = await getUserId();
  await prisma.document.delete({
    where: { id: documentId, userId },
  });
}

export async function renameDocument(documentId: string, title: string) {
  const userId = await getUserId();
  await prisma.document.update({
    where: { id: documentId, userId },
    data: { title },
  });
}
