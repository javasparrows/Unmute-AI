import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getPlanInfo } from "@/lib/plans";
import { getUsageSummary } from "@/app/actions/usage";
import { BillingClient } from "@/components/billing/billing-client";
import { SiteHeader } from "@/components/layout/site-header";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
    },
  });

  const plan = user?.plan ?? "FREE";
  const planInfo = getPlanInfo(plan);
  const usage = await getUsageSummary(session.user.id, plan);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <BillingClient
          plan={plan}
          planName={planInfo.name}
          price={planInfo.price}
          subscriptionStatus={user?.subscriptionStatus ?? null}
          currentPeriodEnd={
            user?.currentPeriodEnd?.toISOString() ?? null
          }
          usage={usage}
        />
      </main>
    </div>
  );
}
