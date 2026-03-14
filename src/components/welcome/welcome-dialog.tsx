"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createDocument } from "@/app/actions/document";
import { Sparkles, PenLine, Globe, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function dismissWelcome() {
  fetch("/api/user/dismiss-welcome", { method: "POST" }).catch(() => {
    // Fire-and-forget: silently ignore errors
  });
}

interface WelcomeDialogProps {
  open: boolean;
}

export function WelcomeDialog({ open: initialOpen }: WelcomeDialogProps) {
  const [open, setOpen] = useState(initialOpen);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("welcome");

  const handleCreateDocument = () => {
    dismissWelcome();
    startTransition(async () => {
      const doc = await createDocument();
      router.push(`/documents/${doc.id}`);
    });
  };

  const handleGoToDashboard = () => {
    dismissWelcome();
    setOpen(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      dismissWelcome();
    }
    setOpen(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl">{t("title")}</DialogTitle>
          <DialogDescription className="text-base">
            {t("subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <PenLine className="h-5 w-5 shrink-0 text-primary" />
            <span>{t("feature1")}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Globe className="h-5 w-5 shrink-0 text-primary" />
            <span>{t("feature2")}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Zap className="h-5 w-5 shrink-0 text-primary" />
            <span>{t("feature3")}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleCreateDocument}
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            {t("createFirst")}
          </Button>
          <Button
            variant="ghost"
            onClick={handleGoToDashboard}
            className="w-full text-muted-foreground"
            size="sm"
          >
            {t("goToDashboard")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
