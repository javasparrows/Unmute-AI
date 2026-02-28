import { auth } from "@/lib/auth";
import { getDocuments, createDocument } from "@/app/actions/document";
import { UserMenu } from "@/components/auth/user-menu";
import { DocumentList } from "@/components/dashboard/document-list";

export default async function DashboardPage() {
  const session = await auth();
  const documents = await getDocuments();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 bg-secondary text-secondary-foreground shadow-md">
        <h1 className="text-lg font-semibold tracking-tight">
          Translation Editor
        </h1>
        {session?.user && <UserMenu user={session.user} />}
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">マイドキュメント</h2>
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
