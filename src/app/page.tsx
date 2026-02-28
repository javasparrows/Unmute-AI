import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDocuments, createDocument } from "@/app/actions/document";
import { UserMenu } from "@/components/auth/user-menu";
import { DocumentList } from "@/components/dashboard/document-list";
import { Badge } from "@/components/ui/badge";
import { getUserPlanById } from "@/lib/user-plan";
import { getPlanInfo, isUnlimited } from "@/lib/plans";

export default async function DashboardPage() {
  const session = await auth();
  const documents = await getDocuments();

  const plan = session?.user?.id
    ? (await getUserPlanById(session.user.id)).plan
    : "FREE";
  const planInfo = getPlanInfo(plan);
  const docLimit = planInfo.limits.maxDocuments;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 bg-secondary text-secondary-foreground shadow-md">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">
            Translation Editor
          </h1>
          <Link href="/pricing">
            <Badge
              variant={plan === "FREE" ? "outline" : "default"}
              className="cursor-pointer hover:opacity-80"
            >
              {planInfo.name}
            </Badge>
          </Link>
        </div>
        {session?.user && <UserMenu user={session.user} />}
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">マイドキュメント</h2>
            {!isUnlimited(docLimit) && (
              <span className="text-sm text-muted-foreground">
                {documents.length} / {docLimit}
              </span>
            )}
          </div>
          <form action={createDocument}>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              + 新規作成
            </button>
          </form>
        </div>

        <DocumentList documents={documents} />
      </main>
    </div>
  );
}
