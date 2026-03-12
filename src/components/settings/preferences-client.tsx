"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const KEYBOARD_SHORTCUTS = [
  { action: "テキストクリア", shortcut: "Ctrl + Shift + X" },
];

export function PreferencesClient() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  return (
    <div className="space-y-6">
      {returnTo && (
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link href={returnTo}>
            <ArrowLeft className="h-4 w-4" />
            エディタに戻る
          </Link>
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>キーボードショートカット</CardTitle>
          <CardDescription>エディタで使用できるショートカット</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {KEYBOARD_SHORTCUTS.map(({ action, shortcut }) => (
              <div key={action} className="flex items-center justify-between">
                <span className="text-sm">{action}</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  {shortcut}
                </kbd>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アプリケーション情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">バージョン</span>
            <span className="text-sm text-muted-foreground">
              Unmute AI v0.1.0
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
