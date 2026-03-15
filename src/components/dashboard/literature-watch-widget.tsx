"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface WatchResult {
  title: string;
  authors: string;
  year: number | null;
  doi: string | null;
}

interface Watch {
  id: string;
  topic: string;
  query: string;
  lastChecked: string | null;
  results: WatchResult[] | null;
}

export function LiteratureWatchWidget() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/literature-watch")
      .then((res) => res.ok ? res.json() : { watches: [] })
      .then((data) => setWatches(data.watches))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newTopic.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/literature-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: newTopic, query: newTopic }),
      });
      if (res.ok) {
        const data = await res.json();
        setWatches((prev) => [data.watch, ...prev]);
        setNewTopic("");
        setShowAdd(false);
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading) return null;

  const latestResults = watches
    .flatMap((w) => (Array.isArray(w.results) ? w.results.slice(0, 3) : []))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            文献ウォッチ
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowAdd(!showAdd)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {showAdd && (
          <div className="flex gap-2">
            <Input
              placeholder="トピックを入力..."
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="text-xs h-8"
            />
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={adding}>
              {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : "追加"}
            </Button>
          </div>
        )}

        {watches.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {watches.map((w) => (
              <Badge key={w.id} variant="secondary" className="text-xs">
                {w.topic}
              </Badge>
            ))}
          </div>
        )}

        {latestResults.length > 0 ? (
          <div className="space-y-1.5">
            {latestResults.map((r, i) => (
              <div key={i} className="text-xs space-y-0.5">
                <p className="font-medium line-clamp-1">{r.title}</p>
                <p className="text-muted-foreground">
                  {r.authors} {r.year && `(${r.year})`}
                </p>
                {r.doi && (
                  <a
                    href={r.doi.startsWith("http") ? r.doi : `https://doi.org/${r.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-0.5 hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    DOI
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : watches.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            研究トピックを追加して新着論文をウォッチしましょう
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">新着論文はありません</p>
        )}
      </CardContent>
    </Card>
  );
}
