import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { CitationsPageClient } from "@/components/pages/citations-page-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CitationsPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const doc = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          translatedText: true,
          journal: true,
        },
      },
    },
  });

  if (!doc) notFound();

  const version = doc.versions[0];

  return (
    <div className="flex flex-col h-screen bg-background">
      <SiteHeader />
      <CitationsPageClient
        documentId={id}
        documentTitle={doc.title}
        draftText={version?.translatedText ?? ""}
      />
    </div>
  );
}
