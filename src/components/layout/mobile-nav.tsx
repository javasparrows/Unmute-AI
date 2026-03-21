"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileNavProps {
  links: { href: string; label: string }[];
  loginLabel: string;
  getStartedLabel: string;
}

export function MobileNav({ links, loginLabel, getStartedLabel }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="sm:hidden" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg">Unmute AI</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/80 hover:text-foreground transition-colors text-base py-3 border-b border-border/50"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 px-4 mt-auto mb-4">
          <Link href="/login" onClick={() => setOpen(false)}>
            <Button variant="outline" className="w-full">
              {loginLabel}
            </Button>
          </Link>
          <Link href="/login" onClick={() => setOpen(false)}>
            <Button className="w-full">
              {getStartedLabel}
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
