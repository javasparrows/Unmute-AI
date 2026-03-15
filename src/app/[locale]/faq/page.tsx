import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { JsonLd } from "@/components/seo/json-ld";

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
  const t = await getTranslations({ locale, namespace: "metadata.faq" });

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
    languages[loc] = `${BASE_URL}${prefix}/faq`;
  }
  languages["x-default"] = `${BASE_URL}/faq`;

  const url =
    locale === routing.defaultLocale
      ? `${BASE_URL}/faq`
      : `${BASE_URL}/${locale}/faq`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: url, languages },
  };
}

export default async function FAQPage() {
  const t = await getTranslations("faq");

  // Build FAQ items from translations
  const items: { question: string; answer: string }[] = [];
  for (let i = 0; i < 10; i++) {
    try {
      const question = t(`items.${i}.question`);
      const answer = t(`items.${i}.answer`);
      if (question && answer) items.push({ question, answer });
    } catch {
      break;
    }
  }

  // FAQPage JSON-LD
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={faqSchema} />
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>

        <div className="space-y-6">
          {items.map((item, i) => (
            <details key={i} className="group border rounded-lg">
              <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-sm hover:bg-accent/50 transition-colors list-none">
                <span>{item.question}</span>
                <span className="ml-4 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">
                  &#x25BC;
                </span>
              </summary>
              <div className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">
                {item.answer}
              </div>
            </details>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/login">
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Try Unmute AI
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
