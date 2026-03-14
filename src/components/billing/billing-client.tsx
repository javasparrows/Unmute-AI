"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { isUnlimited } from "@/lib/plans";
import {
  createPortalSession,
  reactivateSubscription,
} from "@/app/actions/stripe";
import type { Plan } from "@/generated/prisma/client";

interface UsageItem {
  used: number;
  limit: number;
}

interface BillingClientProps {
  plan: Plan;
  planName: string;
  price: number;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    translationChars: UsageItem;
    structureChecks: UsageItem;
    documents: UsageItem;
  };
}

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = isUnlimited(limit);
  const percentage = unlimited ? 0 : Math.min((used / limit) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()}
          {unlimited ? "" : ` / ${limit.toLocaleString()}`}
          {unlimited && " (無制限)"}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={percentage}
          className={percentage >= 90 ? "[&>div]:bg-destructive" : ""}
        />
      )}
    </div>
  );
}

export function BillingClient({
  plan,
  planName,
  price,
  subscriptionStatus,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  usage,
}: BillingClientProps) {
  const router = useRouter();
  const [reactivating, setReactivating] = useState(false);

  async function handleManageSubscription() {
    const result = await createPortalSession();
    if (result.url) {
      window.location.href = result.url;
    }
  }

  async function handleReactivate() {
    setReactivating(true);
    try {
      const result = await reactivateSubscription();
      if (result.success) {
        router.refresh();
      } else {
        alert(
          result.error ?? "キャンセルの取り消しに失敗しました。もう一度お試しください。",
        );
      }
    } finally {
      setReactivating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cancellation warning banner */}
      {cancelAtPeriodEnd && currentPeriodEnd && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                現在のプランは{" "}
                {new Date(currentPeriodEnd).toLocaleDateString("ja-JP")}{" "}
                に終了し、Freeプランに変更されます。
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReactivate}
                disabled={reactivating}
                className="border-amber-500 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-950/40"
              >
                {reactivating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  "キャンセルを取り消す"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current plan card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">現在のプラン</CardTitle>
              <CardDescription>
                {price > 0
                  ? `¥${price.toLocaleString()}/月`
                  : "無料プラン"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={plan === "FREE" ? "outline" : "default"}>
                {planName}
              </Badge>
              {subscriptionStatus && subscriptionStatus !== "active" && (
                <Badge variant="destructive">{subscriptionStatus}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              次回更新日:{" "}
              {new Date(currentPeriodEnd).toLocaleDateString("ja-JP")}
            </p>
          )}
          <div className="flex gap-3">
            {plan !== "FREE" && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
              >
                サブスクリプション管理
              </Button>
            )}
            <Button variant="default" asChild>
              <a href="/pricing">
                {plan === "FREE" ? "アップグレード" : "プラン変更"}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage card */}
      <Card>
        <CardHeader>
          <CardTitle>今月の使用量</CardTitle>
          <CardDescription>
            使用量は毎月1日にリセットされます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageMeter
            label="翻訳文字数"
            used={usage.translationChars.used}
            limit={usage.translationChars.limit}
          />
          <UsageMeter
            label="構成チェック回数"
            used={usage.structureChecks.used}
            limit={usage.structureChecks.limit}
          />
          <UsageMeter
            label="ドキュメント数"
            used={usage.documents.used}
            limit={usage.documents.limit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
