"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PlanInfo } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";
import { createCheckoutSession } from "@/app/actions/stripe";

interface PricingCardProps {
  plan: PlanInfo;
  currentPlan?: Plan;
  isLoggedIn: boolean;
  popular?: boolean;
}

export function PricingCard({
  plan,
  currentPlan,
  isLoggedIn,
  popular,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const isCurrent = currentPlan === plan.id;
  const isDowngrade =
    currentPlan &&
    (currentPlan === "MAX" ||
      (currentPlan === "PRO" && plan.id === "FREE"));

  async function handleSubscribe() {
    if (!plan.stripePriceId || loading) return;
    setLoading(true);
    const result = await createCheckoutSession(plan.stripePriceId);
    if (result.url) {
      window.location.href = result.url;
    } else {
      alert(result.error ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card
      className={`relative flex flex-col ${popular ? "border-primary shadow-lg scale-105" : ""}`}
    >
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
          人気
        </Badge>
      )}
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-4">
          {plan.price === 0 ? (
            <span className="text-4xl font-bold">無料</span>
          ) : (
            <>
              <span className="text-4xl font-bold">
                ¥{plan.price.toLocaleString()}
              </span>
              <span className="text-muted-foreground">/月</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isCurrent ? (
          <Button className="w-full" variant="outline" disabled>
            現在のプラン
          </Button>
        ) : plan.id === "FREE" ? (
          <Button className="w-full" variant="outline" disabled={!isLoggedIn}>
            {isLoggedIn ? (isDowngrade ? "ダウングレード" : "現在のプラン") : "無料で始める"}
          </Button>
        ) : (
          <form action={handleSubscribe} className="w-full">
            <Button
              type="submit"
              className="w-full"
              variant={popular ? "default" : "outline"}
              disabled={!isLoggedIn || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : !isLoggedIn
                ? "ログインして申し込む"
                : isDowngrade
                  ? "ダウングレード"
                  : "アップグレード"}
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}
