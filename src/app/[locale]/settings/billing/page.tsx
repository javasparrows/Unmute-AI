import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getPlanInfo } from "@/lib/plans";
import { getUserPlanById } from "@/lib/user-plan";
import { getUsageSummary } from "@/app/actions/usage";
import { BillingClient } from "@/components/billing/billing-client";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [{ plan }, user] = await Promise.all([
    getUserPlanById(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionStatus: true,
        currentPeriodEnd: true,
      },
    }),
  ]);

  const planInfo = getPlanInfo(plan);
  const usage = await getUsageSummary(session.user.id, plan);

  return (
    <BillingClient
      plan={plan}
      planName={planInfo.name}
      price={planInfo.price}
      subscriptionStatus={user?.subscriptionStatus ?? null}
      currentPeriodEnd={user?.currentPeriodEnd?.toISOString() ?? null}
      usage={usage}
    />
  );
}
