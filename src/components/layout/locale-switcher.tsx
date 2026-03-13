"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALE_CONFIG: Record<string, { flag: string; label: string }> = {
  ja: { flag: "🇯🇵", label: "日本語" },
  en: { flag: "🇺🇸", label: "English" },
  "zh-CN": { flag: "🇨🇳", label: "简体中文" },
  "zh-TW": { flag: "🇹🇼", label: "繁體中文" },
  ko: { flag: "🇰🇷", label: "한국어" },
  de: { flag: "🇩🇪", label: "Deutsch" },
  fr: { flag: "🇫🇷", label: "Français" },
  es: { flag: "🇪🇸", label: "Español" },
  "pt-BR": { flag: "🇧🇷", label: "Português (BR)" },
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2">
          <span>{LOCALE_CONFIG[locale]?.flag}</span>
          <span className="text-xs uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => switchLocale(l)}
            className={l === locale ? "font-medium bg-accent" : ""}
          >
            <span>{LOCALE_CONFIG[l]?.flag}</span>
            {LOCALE_CONFIG[l]?.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
