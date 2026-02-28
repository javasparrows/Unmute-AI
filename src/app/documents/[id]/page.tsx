import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { EditorPageClient } from "@/components/editor/editor-page-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentEditorPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const document = await prisma.document.findUnique({
    where: { id, userId: session.user.id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!document) notFound();

  const latestVersion = document.versions[0] ?? null;

  return (
    <EditorPageClient
      documentId={document.id}
      documentTitle={document.title}
      initialVersion={
        latestVersion
          ? {
              versionNumber: latestVersion.versionNumber,
              sourceText: latestVersion.sourceText,
              translatedText: latestVersion.translatedText,
              sourceLang: latestVersion.sourceLang,
              targetLang: latestVersion.targetLang,
              journal: latestVersion.journal,
              provider: latestVersion.provider,
              leftRanges: latestVersion.leftRanges as { from: number; to: number }[] | null,
              rightRanges: latestVersion.rightRanges as { from: number; to: number }[] | null,
            }
          : null
      }
      user={session.user}
    />
  );
}
