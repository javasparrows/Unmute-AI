import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshJourneyStatus } from "@/lib/journey/auto-complete";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;

  // Refresh auto-completion status
  await refreshJourneyStatus(documentId);

  const journey = await prisma.paperJourney.findUnique({
    where: { documentId },
    include: {
      taskCompletions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!journey) {
    return Response.json({ error: "Journey not found" }, { status: 404 });
  }

  return Response.json(journey);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  const body = await request.json();

  const journey = await prisma.paperJourney.findUnique({
    where: { documentId },
  });

  if (!journey) {
    return Response.json({ error: "Journey not found" }, { status: 404 });
  }

  // Handle task completion
  if (body.completeTask) {
    const taskId = body.completeTask;
    const taskStatuses = (journey.taskStatuses as Record<string, string>) ?? {};
    taskStatuses[taskId] = "completed";

    await prisma.taskCompletion.upsert({
      where: { journeyId_taskId: { journeyId: journey.id, taskId } },
      create: {
        journeyId: journey.id,
        taskId,
        status: "completed",
        autoCompleted: false,
        completedAt: new Date(),
      },
      update: {
        status: "completed",
        autoCompleted: false,
        completedAt: new Date(),
      },
    });

    await prisma.paperJourney.update({
      where: { id: journey.id },
      data: { taskStatuses: JSON.parse(JSON.stringify(taskStatuses)) },
    });
  }

  // Handle task skip
  if (body.skipTask) {
    const taskId = body.skipTask;
    const reason = body.skipReason ?? "";
    const taskStatuses = (journey.taskStatuses as Record<string, string>) ?? {};
    taskStatuses[taskId] = "skipped";

    await prisma.taskCompletion.upsert({
      where: { journeyId_taskId: { journeyId: journey.id, taskId } },
      create: {
        journeyId: journey.id,
        taskId,
        status: "skipped",
        autoCompleted: false,
        skippedReason: reason,
      },
      update: {
        status: "skipped",
        skippedReason: reason,
      },
    });

    await prisma.paperJourney.update({
      where: { id: journey.id },
      data: { taskStatuses: JSON.parse(JSON.stringify(taskStatuses)) },
    });
  }

  // Handle guide visibility toggle
  if (body.guideVisible !== undefined) {
    await prisma.paperJourney.update({
      where: { id: journey.id },
      data: { guideVisible: body.guideVisible },
    });
  }

  // Refresh and return updated journey
  await refreshJourneyStatus(documentId);

  const updated = await prisma.paperJourney.findUnique({
    where: { documentId },
    include: { taskCompletions: true },
  });

  return Response.json(updated);
}
