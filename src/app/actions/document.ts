"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
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
        select: {
          versionNumber: true,
          sourceLang: true,
          targetLang: true,
          journal: true,
        },
      },
      _count: {
        select: {
          manuscriptCitations: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

interface CreateDocumentOptions {
  title?: string;
  topic?: string;
  sourceLang?: string;
  targetLang?: string;
  journal?: string;
}

export async function createDocument(options?: CreateDocumentOptions): Promise<{ id: string }> {
  const userId = await getUserId();
  const { plan } = await getUserPlanById(userId);
  const limitCheck = await checkDocumentLimit(userId, plan);
  if (!limitCheck.allowed) {
    throw new Error(
      `ドキュメント数の上限（${limitCheck.max}件）に達しました。プランをアップグレードしてください。`,
    );
  }

  const title = options?.title || "無題の論文";

  const doc = await prisma.document.create({
    data: {
      userId,
      title,
      versions: {
        create: {
          versionNumber: 1,
          sourceText: "",
          translatedText: "",
          sourceLang: options?.sourceLang ?? "ja",
          targetLang: options?.targetLang ?? "en",
          journal: options?.journal ?? null,
        },
      },
    },
  });
  return { id: doc.id };
}

export async function deleteDocument(documentId: string) {
  const userId = await getUserId();
  await prisma.document.delete({
    where: { id: documentId, userId },
  });
  revalidatePath("/dashboard");
}

export async function renameDocument(documentId: string, title: string) {
  const userId = await getUserId();
  await prisma.document.update({
    where: { id: documentId, userId },
    data: { title },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/documents/${documentId}`);
}
