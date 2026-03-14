"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PlanInfo } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";
import {
  createCheckoutSession,
  cancelSubscription,
  changeSubscription,
} from "@/app/actions/stripe";

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);
  const isCurrent = currentPlan === plan.id;
  const isDowngrade =
    currentPlan &&
    (currentPlan === "MAX" ||
      (currentPlan === "PRO" && plan.id === "FREE"));
  const isDowngradeToFree =
    isDowngrade && plan.id === "FREE";
  const isDowngradeToProFromMax =
    currentPlan === "MAX" && plan.id === "PRO";

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

  async function handleDowngrade() {
    setLoading(true);
    try {
      if (isDowngradeToFree) {
        const result = await cancelSubscription();
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error ?? "ダウングレードに失敗しました。もう一度お試しください。");
        }
      } else if (isDowngradeToProFromMax && plan.stripePriceId) {
        const result = await changeSubscription(plan.stripePriceId);
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error ?? "プラン変更に失敗しました。もう一度お試しください。");
        }
      }
    } finally {
      setLoading(false);
      setDowngradeDialogOpen(false);
    }
  }

  function getDialogTitle(): string {
    if (isDowngradeToFree) return "ダウングレードの確認";
    return "プラン変更の確認";
  }

  function getDialogDescription(): string {
    if (isDowngradeToFree) {
      return "現在のプランは請求期間の終了まで引き続きご利用いただけます。期間終了後、Freeプランに変更されます。";
    }
    return "MaxプランからProプランへ変更します。差額は日割りで調整されます。";
  }

  return (
    <>
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
            <Button
              className="w-full"
              variant="outline"
              disabled={!isLoggedIn || loading}
              onClick={isDowngradeToFree ? () => setDowngradeDialogOpen(true) : undefined}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : isLoggedIn ? (
                isDowngrade ? "ダウングレード" : "現在のプラン"
              ) : (
                "無料で始める"
              )}
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={popular ? "default" : "outline"}
              disabled={!isLoggedIn || loading}
              onClick={
                isDowngradeToProFromMax
                  ? () => setDowngradeDialogOpen(true)
                  : handleSubscribe
              }
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
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDialogTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getDialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDowngrade}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                "ダウングレードする"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
