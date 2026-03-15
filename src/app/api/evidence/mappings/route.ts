import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return Response.json({ error: "documentId required" }, { status: 400 });
  }

  const mappings = await prisma.evidenceMapping.findMany({
    where: { documentId },
    include: {
      manuscriptCitation: {
        include: {
          paper: {
            include: {
              identifiers: true,
            },
          },
        },
      },
    },
    orderBy: { sentenceIndex: "asc" },
  });

  return Response.json({ mappings });
}
