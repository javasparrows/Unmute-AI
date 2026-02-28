import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { PricingCard } from "@/components/pricing/pricing-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/generated/prisma/client";

export default async function PricingPage() {
  const session = await auth();
  const currentPlan: Plan | undefined = session?.user?.plan;
  const plans = [PLANS.FREE, PLANS.PRO, PLANS.MAX] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 bg-secondary text-secondary-foreground shadow-md">
        <Link href="/">
          <h1 className="text-lg font-semibold tracking-tight">
            Translation Editor
          </h1>
        </Link>
        {session?.user ? (
          <Link href="/">
            <Button variant="ghost" size="sm">
              ダッシュボード
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button variant="ghost" size="sm">
              ログイン
            </Button>
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">料金プラン</h2>
          <p className="text-muted-foreground text-lg">
            あなたの研究スタイルに合ったプランをお選びください
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              isLoggedIn={!!session?.user}
              popular={plan.id === "PRO"}
            />
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>全プラン14日間返金保証。いつでもキャンセル可能です。</p>
        </div>
      </main>
    </div>
  );
}
