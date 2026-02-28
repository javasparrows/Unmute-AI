"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  message: string;
}

export function UpgradePrompt({ message }: UpgradePromptProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <p className="text-sm text-destructive flex-1">{message}</p>
      <Link href="/pricing">
        <Button size="sm" variant="default">
          プランを確認
        </Button>
      </Link>
    </div>
  );
}
