import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLiteratureWatch } from "@/lib/literature-watch";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const watches = await prisma.literatureWatch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ watches });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { topic, query } = body;

  if (!topic || !query) {
    return Response.json({ error: "topic and query required" }, { status: 400 });
  }

  const watch = await prisma.literatureWatch.create({
    data: {
      userId: session.user.id,
      topic,
      query,
    },
  });

  // Run initial check
  const results = await checkLiteratureWatch(watch.id);

  return Response.json({ watch: { ...watch, results } });
}
