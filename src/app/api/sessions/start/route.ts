import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId } = body;

  if (!documentId) {
    return Response.json({ error: "documentId required" }, { status: 400 });
  }

  // Get current word count
  const version = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { versionNumber: "desc" },
    select: { translatedText: true },
  });

  const wordsAtStart = version?.translatedText?.length ?? 0;

  const writingSession = await prisma.writingSession.create({
    data: {
      userId: session.user.id,
      documentId,
      wordsAtStart,
      status: "ACTIVE",
    },
  });

  return Response.json({ id: writingSession.id });
}
