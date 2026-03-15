import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Languages,
  BookOpen,
  Layers,
  GitBranch,
  DollarSign,
  FileCheck,
  PenLine,
  LayoutTemplate,
  Sparkles,
  Shield,
  Brain,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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
  const t = await getTranslations({ locale, namespace: "metadata.landing" });

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] =
      loc === routing.defaultLocale ? BASE_URL : `${BASE_URL}/${loc}`;
  }

  const url =
    locale === routing.defaultLocale ? BASE_URL : `${BASE_URL}/${locale}`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url,
      siteName: "Unmute AI",
      locale: locale.replace("-", "_"),
      type: "website",
      images: [
        {
          url: `${BASE_URL}/og/landing.png`,
          width: 2205,
          height: 1349,
          alt: "Unmute AI - AI Academic Translation",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: [`${BASE_URL}/og/landing.png`],
    },
  };
}

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const steps = [
    {
      icon: PenLine,
      number: "01",
      title: t("howItWorks.step1Title"),
      description: t("howItWorks.step1Description"),
    },
    {
      icon: LayoutTemplate,
      number: "02",
      title: t("howItWorks.step2Title"),
      description: t("howItWorks.step2Description"),
    },
    {
      icon: Sparkles,
      number: "03",
      title: t("howItWorks.step3Title"),
      description: t("howItWorks.step3Description"),
    },
  ];

  const coreValues = [
    {
      icon: Brain,
      title: t("features.academicPrecisionTitle"),
      description: t("features.academicPrecisionDescription"),
    },
    {
      icon: Zap,
      title: t("features.zeroCognitiveLoadTitle"),
      description: t("features.zeroCognitiveLoadDescription"),
    },
    {
      icon: Shield,
      title: t("features.securityPrivacyTitle"),
      description: t("features.securityPrivacyDescription"),
    },
  ];

  const features = [
    {
      icon: Languages,
      title: t("features.realtimeTranslationTitle"),
      description: t("features.realtimeTranslationDescription"),
    },
    {
      icon: BookOpen,
      title: t("features.journalStylingTitle"),
      description: t("features.journalStylingDescription"),
    },
    {
      icon: Layers,
      title: t("features.latexAwareTitle"),
      description: t("features.latexAwareDescription"),
    },
    {
      icon: FileCheck,
      title: t("features.structureCheckTitle"),
      description: t("features.structureCheckDescription"),
    },
    {
      icon: GitBranch,
      title: t("features.versionControlTitle"),
      description: t("features.versionControlDescription"),
    },
    {
      icon: DollarSign,
      title: t("features.costTrackingTitle"),
      description: t("features.costTrackingDescription"),
    },
  ];

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Unmute AI",
    url: "https://unmute-ai.com",
    description: "AI-powered academic translation for researchers worldwide",
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Unmute AI",
    url: "https://unmute-ai.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered academic translation that understands journal styles, paper structure, and your intent.",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "2980",
      priceCurrency: "JPY",
      offerCount: 3,
    },
    featureList: [
      "AI-powered academic translation",
      "Journal-specific style formatting (8 styles)",
      "LaTeX-aware translation",
      "IMRAD structure checking",
      "Real-time bidirectional translation",
      "Citation Auto-Pilot",
      "17 language support",
    ],
    inLanguage: [
      "ja",
      "en",
      "zh-CN",
      "zh-TW",
      "ko",
      "de",
      "fr",
      "es",
      "pt-BR",
      "ru",
      "it",
      "hi",
      "tr",
      "ar",
      "id",
      "pl",
      "fa",
    ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t("howItWorks.title"),
    description: t("howItWorks.subtitle"),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={organizationSchema} />
      <JsonLd data={webAppSchema} />
      <JsonLd data={howToSchema} />
      <SiteHeader />

      <article itemScope itemType="https://schema.org/WebApplication">
        <meta itemProp="name" content="Unmute AI" />
        <meta itemProp="applicationCategory" content="Academic Translation Tool" />

      {/* Hero */}
      <section aria-label="Hero" className="bg-secondary py-28 sm:py-36">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-secondary-foreground">
            {t("hero.title1")}
            <br />
            <span className="text-primary">{t("hero.title2")}</span>
          </h1>
          <p className="mt-6 text-lg text-secondary-foreground/70 max-w-2xl mx-auto leading-relaxed">
            {t("hero.description")}
          </p>
          <div className="mt-10">
            <Link href="/login">
              <Button size="lg" className="gap-2 text-base px-8 py-6">
                {t("hero.cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section aria-label="Statistics" className="py-12 border-b">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary">{t("stats.stat1Value")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("stats.stat1Label")}</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary">{t("stats.stat2Value")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("stats.stat2Label")}</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary">{t("stats.stat3Value")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("stats.stat3Label")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section aria-label="Problem" className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            {t("problem.title1")}
            <br />
            {t("problem.title2")}
          </h2>
          <p className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            {t("problem.description")}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section aria-label="How It Works" className="bg-secondary py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl text-secondary-foreground">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-4 text-secondary-foreground/70 text-lg">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm font-mono text-primary mb-2">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-secondary-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-secondary-foreground/70 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" aria-label="Features" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {t("features.sectionTitle")}
            </h2>
          </div>

          {/* Core values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {coreValues.map((value) => (
              <div
                key={value.title}
                className="text-center p-6 rounded-2xl bg-accent/50"
              >
                <value.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-0 shadow-none bg-card"
              >
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section aria-label="Comparison" className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {t("comparison.title")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              {t("comparison.subtitle")}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pe-4 text-muted-foreground font-medium"></th>
                  <th className="py-3 px-4 text-center font-bold text-primary">{t("comparison.unmute")}</th>
                  <th className="py-3 px-4 text-center font-medium text-muted-foreground">{t("comparison.chatgpt")}</th>
                  <th className="py-3 px-4 text-center font-medium text-muted-foreground">{t("comparison.deepl")}</th>
                </tr>
              </thead>
              <tbody>
                {(["feature1", "feature2", "feature3", "feature4", "feature5", "feature6", "feature7"] as const).map((key) => (
                  <tr key={key} className="border-b border-border/50">
                    <td className="py-3 pe-4">{t(`comparison.${key}`)}</td>
                    <td className="py-3 px-4 text-center text-green-600 dark:text-green-400">&#10003;</td>
                    <td className="py-3 px-4 text-center text-muted-foreground/60">
                      {key === "feature1" || key === "feature6" ? "\u25B3" : "\u2717"}
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground/60">
                      {key === "feature1" ? "\u25B3" : key === "feature6" ? "\u2713" : "\u2717"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section aria-label="Call to Action" className="bg-secondary py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight text-secondary-foreground">
            {t("cta.title1")}
            <br />
            {t("cta.title2")}
          </h2>
          <p className="mt-6 text-secondary-foreground/70 text-lg max-w-xl mx-auto">
            {t("cta.description")}
          </p>
          <div className="mt-10">
            <Link href="/login">
              <Button size="lg" className="gap-2 text-base px-8 py-6">
                {t("cta.button")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      </article>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="font-serif font-bold text-foreground">Unmute AI</div>
          <div className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              {t("footer.pricing")}
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              {t("footer.terms")}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href="/legal/tokushoho"
              className="hover:text-foreground transition-colors"
            >
              {t("footer.tokushoho")}
            </Link>
          </div>
          <div>&copy; {new Date().getFullYear()} Unmute AI</div>
        </div>
      </footer>
    </div>
  );
}
