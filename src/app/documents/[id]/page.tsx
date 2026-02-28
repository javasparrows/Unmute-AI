import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditorPageClient } from "@/components/editor/editor-page-client";
import { getUserPlanById } from "@/lib/user-plan";
import { getPlanInfo } from "@/lib/plans";

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
  const { plan } = await getUserPlanById(session.user.id);
  const planInfo = getPlanInfo(plan);

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
      planLimits={{
        allowedJournalIds: planInfo.limits.allowedJournalIds,
      }}
    />
  );
}
