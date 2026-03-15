import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, pomodoroCount } = body;

  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  const writingSession = await prisma.writingSession.findUnique({
    where: { id: sessionId },
  });

  if (!writingSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Get current word count
  const version = await prisma.documentVersion.findFirst({
    where: { documentId: writingSession.documentId },
    orderBy: { versionNumber: "desc" },
    select: { translatedText: true },
  });

  const wordsAtEnd = version?.translatedText?.length ?? 0;
  const wordsWritten = Math.max(0, wordsAtEnd - writingSession.wordsAtStart);

  const updated = await prisma.writingSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      wordsAtEnd,
      wordsWritten,
      pomodoroCount: pomodoroCount ?? writingSession.pomodoroCount,
    },
  });

  return Response.json({
    id: updated.id,
    wordsWritten: updated.wordsWritten,
    pomodoroCount: updated.pomodoroCount,
    duration: updated.endedAt && updated.startedAt
      ? Math.round((updated.endedAt.getTime() - updated.startedAt.getTime()) / 1000 / 60)
      : 0,
  });
}
