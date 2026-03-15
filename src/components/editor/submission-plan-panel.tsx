"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Send,
  Users,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  SubmissionCheckItem,
  ReviewerCandidate,
} from "@/lib/submission/types";

interface SubmissionPlan {
  documentId: string;
  targetJournal: string | null;
  targetDate: string | null;
  coverLetter: string | null;
  checklist: SubmissionCheckItem[];
  reviewerCandidates: ReviewerCandidate[];
  notes: string | null;
}

interface SubmissionPlanPanelProps {
  documentId: string;
}

export function SubmissionPlanPanel({ documentId }: SubmissionPlanPanelProps) {
  const [plan, setPlan] = useState<SubmissionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/v2/submission/${documentId}`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const savePlan = async (updates: Partial<SubmissionPlan>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v2/submission/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleCheckItem = (itemId: string) => {
    if (!plan) return;
    const updated = plan.checklist.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    );
    setPlan({ ...plan, checklist: updated });
    savePlan({ checklist: updated });
  };

  const addReviewer = () => {
    if (!plan) return;
    const newReviewer: ReviewerCandidate = {
      id: `rev-${Date.now()}`,
      name: "",
      affiliation: "",
      expertise: "",
    };
    const updated = [...plan.reviewerCandidates, newReviewer];
    setPlan({ ...plan, reviewerCandidates: updated });
  };

  const updateReviewer = (
    id: string,
    field: keyof ReviewerCandidate,
    value: string,
  ) => {
    if (!plan) return;
    const updated = plan.reviewerCandidates.map((r) =>
      r.id === id ? { ...r, [field]: value } : r,
    );
    setPlan({ ...plan, reviewerCandidates: updated });
  };

  const saveReviewers = () => {
    if (!plan) return;
    savePlan({ reviewerCandidates: plan.reviewerCandidates });
  };

  const removeReviewer = (id: string) => {
    if (!plan) return;
    const updated = plan.reviewerCandidates.filter((r) => r.id !== id);
    setPlan({ ...plan, reviewerCandidates: updated });
    savePlan({ reviewerCandidates: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) return null;

  const checkedCount = plan.checklist.filter((i) => i.checked).length;
  const requiredCount = plan.checklist.filter((i) => i.required).length;
  const requiredChecked = plan.checklist.filter(
    (i) => i.required && i.checked,
  ).length;
  const allRequiredDone = requiredChecked === requiredCount;

  // Group checklist by category
  const categories = Array.from(
    new Set(plan.checklist.map((i) => i.category)),
  );

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4" />
            投稿準備チェックリスト
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    allRequiredDone ? "bg-green-500" : "bg-primary",
                  )}
                  style={{
                    width: `${(checkedCount / plan.checklist.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {checkedCount}/{plan.checklist.length}
              {!allRequiredDone && (
                <span className="text-amber-600 ml-1">
                  (必須: {requiredChecked}/{requiredCount})
                </span>
              )}
            </span>
          </div>
          {allRequiredDone && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              必須項目がすべて完了しています
            </p>
          )}
        </CardContent>
      </Card>

      {/* Checklist by category */}
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {plan.checklist
              .filter((item) => item.category === category)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleCheckItem(item.id)}
                  className="flex items-start gap-2 w-full text-left py-1 hover:bg-muted/50 rounded px-1 -mx-1"
                >
                  {item.checked ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle
                      className={cn(
                        "h-4 w-4 shrink-0 mt-0.5",
                        item.required
                          ? "text-amber-500"
                          : "text-muted-foreground/40",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "text-xs",
                      item.checked && "line-through text-muted-foreground",
                    )}
                  >
                    {item.label}
                    {item.required && !item.checked && (
                      <Badge
                        variant="outline"
                        className="text-xs ml-1 py-0"
                      >
                        必須
                      </Badge>
                    )}
                  </span>
                </button>
              ))}
          </CardContent>
        </Card>
      ))}

      {/* Reviewer candidates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              推薦査読者
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={addReviewer}
            >
              <Plus className="h-3 w-3" />
              追加
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.reviewerCandidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              査読者候補を追加してください
            </p>
          ) : (
            plan.reviewerCandidates.map((rev) => (
              <div key={rev.id} className="space-y-1 border rounded p-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="名前"
                    value={rev.name}
                    onChange={(e) =>
                      updateReviewer(rev.id, "name", e.target.value)
                    }
                    onBlur={saveReviewers}
                    className="text-xs h-7"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => removeReviewer(rev.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  placeholder="所属"
                  value={rev.affiliation}
                  onChange={(e) =>
                    updateReviewer(rev.id, "affiliation", e.target.value)
                  }
                  onBlur={saveReviewers}
                  className="text-xs h-7"
                />
                <Input
                  placeholder="専門分野"
                  value={rev.expertise}
                  onChange={(e) =>
                    updateReviewer(rev.id, "expertise", e.target.value)
                  }
                  onBlur={saveReviewers}
                  className="text-xs h-7"
                />
                <Input
                  placeholder="メールアドレス（任意）"
                  value={rev.email ?? ""}
                  onChange={(e) =>
                    updateReviewer(rev.id, "email", e.target.value)
                  }
                  onBlur={saveReviewers}
                  className="text-xs h-7"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Cover letter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            カバーレター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="カバーレターの下書き..."
            value={plan.coverLetter ?? ""}
            onChange={(e) =>
              setPlan({ ...plan, coverLetter: e.target.value })
            }
            onBlur={() => savePlan({ coverLetter: plan.coverLetter ?? "" })}
            className="text-xs min-h-[100px]"
          />
        </CardContent>
      </Card>

      {saving && (
        <p className="text-xs text-muted-foreground text-center">保存中...</p>
      )}
    </div>
  );
}
