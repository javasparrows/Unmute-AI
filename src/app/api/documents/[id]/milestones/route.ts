import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId } = await params;

  const milestones = await prisma.documentMilestone.findMany({
    where: { documentId },
    orderBy: { sortOrder: "asc" },
  });

  return Response.json({ milestones });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId } = await params;
  const body = await request.json();

  const milestone = await prisma.documentMilestone.create({
    data: {
      documentId,
      title: body.title,
      description: body.description ?? null,
      type: body.type ?? "CUSTOM",
      targetDate: new Date(body.targetDate),
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return Response.json(milestone);
}
