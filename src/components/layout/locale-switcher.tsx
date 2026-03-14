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
  en: { flag: "🇺🇸", label: "English" },
  ar: { flag: "🇸🇦", label: "العربية" },
  de: { flag: "🇩🇪", label: "Deutsch" },
  es: { flag: "🇪🇸", label: "Español" },
  fa: { flag: "🇮🇷", label: "فارسی" },
  fr: { flag: "🇫🇷", label: "Français" },
  hi: { flag: "🇮🇳", label: "हिन्दी" },
  id: { flag: "🇮🇩", label: "Bahasa Indonesia" },
  it: { flag: "🇮🇹", label: "Italiano" },
  ja: { flag: "🇯🇵", label: "日本語" },
  ko: { flag: "🇰🇷", label: "한국어" },
  pl: { flag: "🇵🇱", label: "Polski" },
  "pt-BR": { flag: "🇧🇷", label: "Português (BR)" },
  ru: { flag: "🇷🇺", label: "Русский" },
  tr: { flag: "🇹🇷", label: "Türkçe" },
  "zh-CN": { flag: "🇨🇳", label: "简体中文" },
  "zh-TW": { flag: "🇹🇼", label: "繁體中文" },
};

// Display order: English first, then alphabetical by English language name
const LOCALE_DISPLAY_ORDER = [
  "en", "ar", "de", "es", "fa", "fr", "hi", "id", "it",
  "ja", "ko", "pl", "pt-BR", "ru", "tr", "zh-CN", "zh-TW",
];

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
        {LOCALE_DISPLAY_ORDER.map((l) => (
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
