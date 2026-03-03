"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDocument } from "@/app/actions/document";
import { Loader2 } from "lucide-react";

export function CreateDocumentButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    startTransition(async () => {
      const doc = await createDocument();
      router.push(`/documents/${doc.id}`);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={isPending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
    >
      {isPending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          作成中...
        </span>
      ) : (
        "+ 新規作成"
      )}
    </button>
  );
}
