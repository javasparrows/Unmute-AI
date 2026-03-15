"use client";

import { ShieldCheck } from "lucide-react";

export function ReviewView() {
  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      <div className="text-center space-y-2">
        <ShieldCheck className="h-12 w-12 mx-auto opacity-30" />
        <p className="text-sm">Review is coming soon</p>
        <p className="text-xs">Adversarial Review results will appear here</p>
      </div>
    </div>
  );
}
