import { auth } from "@/lib/auth";
import { buildExportManuscript } from "@/lib/export/build-manuscript";
import { renderDocx } from "@/lib/export/render-docx";

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

  const manuscript = await buildExportManuscript(documentId);
  const buffer = await renderDocx(manuscript);

  const safeTitle =
    manuscript.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) ||
    "manuscript";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
    },
  });
}
