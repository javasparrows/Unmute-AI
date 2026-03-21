import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/site-header";
import { PasteCleaner } from "@/components/paste-cleaner/paste-cleaner";

const BASE_URL = "https://unmute-ai.com";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "metadata.pasteCleaner",
  });

  const url =
    locale === routing.defaultLocale
      ? `${BASE_URL}/paste-cleaner`
      : `${BASE_URL}/${locale}/paste-cleaner`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: url },
  };
}

export default async function PasteCleanerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pasteCleaner" });

  const translations = {
    title: t("title"),
    description: t("description"),
    inputPlaceholder: t("inputPlaceholder"),
    outputPlaceholder: t("outputPlaceholder"),
    translateWithDeepL: t("translateWithDeepL"),
    copyToClipboard: t("copyToClipboard"),
    copied: t("copied"),
    ctaTitle: t("ctaTitle"),
    ctaDescription: t("ctaDescription"),
    ctaButton: t("ctaButton"),
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="py-16 sm:py-24">
        <PasteCleaner translations={translations} locale={locale} />
      </main>
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Unmute AI
        </div>
      </footer>
    </div>
  );
}
