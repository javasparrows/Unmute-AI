"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import { createDocument } from "@/app/actions/document";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StartPaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LANGUAGES = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "zh-CN", label: "中文（简体）" },
  { code: "ko", label: "한국어" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];

const JOURNALS = [
  { id: "general", label: "General Academic" },
  { id: "nature", label: "Nature" },
  { id: "science", label: "Science" },
  { id: "pnas", label: "PNAS" },
  { id: "prl", label: "Physical Review Letters" },
  { id: "lancet", label: "The Lancet" },
  { id: "ieee", label: "IEEE" },
  { id: "npj", label: "npj Digital Medicine" },
];

export function StartPaperDialog({ open, onOpenChange }: StartPaperDialogProps) {
  const [title, setTitle] = useState("");
  const [sourceLang, setSourceLang] = useState("ja");
  const [targetLang, setTargetLang] = useState("en");
  const [journal, setJournal] = useState("general");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    startTransition(async () => {
      try {
        const doc = await createDocument({
          title: title.trim() || undefined,
          sourceLang,
          targetLang,
          journal,
        });
        router.push(`/documents/${doc.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "作成に失敗しました");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center">新しい論文を始める</DialogTitle>
          <DialogDescription className="text-center">
            研究トピックとターゲットジャーナルを設定しましょう
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">論文タイトル（仮）</Label>
            <Input
              id="title"
              placeholder="例: Deep learning for medical image segmentation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>執筆言語</Label>
              <Select value={sourceLang} onValueChange={setSourceLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>投稿言語</Label>
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ターゲットジャーナル</Label>
            <Select value={journal} onValueChange={setJournal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOURNALS.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleCreate} disabled={isPending} className="w-full" size="lg">
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              作成中...
            </span>
          ) : (
            "論文を作成"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
