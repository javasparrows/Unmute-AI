"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartPaperDialog } from "./start-paper-dialog";

export function CreateDocumentButton() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        新しい論文を始める
      </Button>
      <StartPaperDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
