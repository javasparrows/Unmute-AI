import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDocuments } from "@/app/actions/document";
import { SiteHeader } from "@/components/layout/site-header";
import { DocumentList } from "@/components/dashboard/document-list";
import { CreateDocumentButton } from "@/components/dashboard/create-document-button";
import { WelcomeDialog } from "@/components/welcome/welcome-dialog";
import { Badge } from "@/components/ui/badge";
import { getUserPlanById } from "@/lib/user-plan";
import { getPlanInfo, isUnlimited } from "@/lib/plans";
import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations("dashboard");
  const documents = await getDocuments();

  const showWelcome = session?.user?.id
    ? !(
        await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { hasSeenWelcome: true },
        })
      )?.hasSeenWelcome
    : false;

  const plan = session?.user?.id
    ? (await getUserPlanById(session.user.id)).plan
    : "FREE";
  const planInfo = getPlanInfo(plan);
  const docLimit = planInfo.limits.maxDocuments;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{t("myDocuments")}</h2>
            <Link href="/pricing">
              <Badge
                variant={plan === "FREE" ? "outline" : "default"}
                className="cursor-pointer hover:opacity-80"
              >
                {planInfo.name}
              </Badge>
            </Link>
            {!isUnlimited(docLimit) && (
              <span className="text-sm text-muted-foreground">
                {documents.length} / {docLimit}
              </span>
            )}
          </div>
          <CreateDocumentButton />
        </div>

        <DocumentList documents={documents} />
      </main>

      {showWelcome && <WelcomeDialog open={true} />}
    </div>
  );
}
