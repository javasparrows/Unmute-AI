import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getPlanInfo } from "@/lib/plans";
import { getUsageSummary } from "@/app/actions/usage";
import { BillingClient } from "@/components/billing/billing-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

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
      <header className="flex items-center justify-between px-6 py-3 bg-secondary text-secondary-foreground shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">
            課金管理
          </h1>
        </div>
      </header>

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
