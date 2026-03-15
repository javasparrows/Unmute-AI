import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { mappingId, verified, note } = body;

  if (!mappingId || verified === undefined) {
    return Response.json(
      { error: "mappingId and verified required" },
      { status: 400 },
    );
  }

  const mapping = await prisma.evidenceMapping.update({
    where: { id: mappingId },
    data: {
      humanVerified: verified,
      verifiedBy: session.user.id,
      verifiedAt: new Date(),
      verificationNote: note ?? null,
      verificationStatus: verified ? "verified" : "rejected",
    },
  });

  return Response.json({
    id: mapping.id,
    humanVerified: mapping.humanVerified,
    verificationStatus: mapping.verificationStatus,
  });
}
