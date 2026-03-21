"use client";

import { useState, useCallback } from "react";
import { X, ExternalLink, Copy, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

interface PasteCleanerTranslations {
  title: string;
  description: string;
  inputPlaceholder: string;
  outputPlaceholder: string;
  translateWithDeepL: string;
  copyToClipboard: string;
  copied: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaButton: string;
}

interface PasteCleanerProps {
  translations: PasteCleanerTranslations;
  locale: string;
}

const DEEPL_LANG_MAP: Record<string, { source: string; target: string }> = {
  ja: { source: "en", target: "ja" },
  en: { source: "ja", target: "en" },
  "zh-CN": { source: "en", target: "zh" },
  "zh-TW": { source: "en", target: "zh" },
  ko: { source: "en", target: "ko" },
  de: { source: "en", target: "de" },
  fr: { source: "en", target: "fr" },
  es: { source: "en", target: "es" },
  "pt-BR": { source: "en", target: "pt" },
  ru: { source: "en", target: "ru" },
  it: { source: "en", target: "it" },
  hi: { source: "en", target: "en" },
  tr: { source: "en", target: "tr" },
  ar: { source: "en", target: "ar" },
  id: { source: "en", target: "id" },
  pl: { source: "en", target: "pl" },
  fa: { source: "en", target: "en" },
};

function shapeText(input: string): string {
  return input.replace(/\n+/g, (match) => {
    if (match.length === 1) return " ";
    return "\n".repeat(match.length - 1);
  });
}

export function PasteCleaner({ translations, locale }: PasteCleanerProps) {
  const [inputText, setInputText] = useState("");
  const [shapedText, setShapedText] = useState("");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setInputText(value);
      setShapedText(shapeText(value));
    },
    [],
  );

  const handleClear = useCallback(() => {
    setInputText("");
    setShapedText("");
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shapedText);
      toast.success(translations.copied);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [shapedText, translations.copied]);

  const handleDeepL = useCallback(() => {
    const lang = DEEPL_LANG_MAP[locale] ?? { source: "en", target: "ja" };
    window.open(
      `https://www.deepl.com/translator#${lang.source}/${lang.target}/${encodeURIComponent(shapedText)}`,
      "_blank",
    );
  }, [locale, shapedText]);

  return (
    <div className="mx-auto max-w-4xl px-6">
      {/* Title + description */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {translations.title}
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          {translations.description}
        </p>
      </div>

      {/* Input area */}
      <div className="relative">
        <textarea
          value={inputText}
          onChange={handleChange}
          placeholder={translations.inputPlaceholder}
          className="w-full h-48 p-4 pr-12 border rounded-lg bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {inputText && (
          <button
            onClick={handleClear}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-4">
        <Button onClick={handleDeepL} disabled={!shapedText}>
          <ExternalLink className="h-4 w-4 mr-2" />
          {translations.translateWithDeepL}
        </Button>
        <Button variant="outline" onClick={handleCopy} disabled={!shapedText}>
          <Copy className="h-4 w-4 mr-2" />
          {translations.copyToClipboard}
        </Button>
      </div>

      {/* Output area */}
      <textarea
        value={shapedText}
        readOnly
        placeholder={translations.outputPlaceholder}
        className="w-full h-48 p-4 mt-4 border rounded-lg bg-muted/50 font-mono text-sm resize-none"
      />

      {/* CTA to main app */}
      <div className="mt-12 text-center p-8 rounded-2xl bg-secondary">
        <p className="text-lg font-medium">{translations.ctaTitle}</p>
        <p className="mt-2 text-muted-foreground">
          {translations.ctaDescription}
        </p>
        <Link href="/login">
          <Button size="lg" className="mt-4 gap-2">
            {translations.ctaButton}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
