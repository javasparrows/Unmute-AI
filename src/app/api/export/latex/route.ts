import { auth } from "@/lib/auth";
import { buildExportManuscript } from "@/lib/export/build-manuscript";
import { renderLatex } from "@/lib/export/render-latex";

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
  const { tex } = renderLatex(manuscript);

  const safeTitle =
    manuscript.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) ||
    "manuscript";

  return new Response(tex, {
    headers: {
      "Content-Type": "application/x-tex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeTitle}.tex"`,
    },
  });
}
