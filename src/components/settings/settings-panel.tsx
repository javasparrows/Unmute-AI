"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function SettingsPanel() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          ⚙
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>設定</SheetTitle>
          <SheetDescription>
            翻訳エディタの設定を変更できます。
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">キーボードショートカット</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>テキストクリア</span>
                <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Ctrl + Shift + X</kbd>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">バージョン</h3>
            <p className="text-sm text-muted-foreground">Lexora v0.1.0</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
