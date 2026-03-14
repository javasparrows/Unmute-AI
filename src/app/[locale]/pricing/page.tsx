import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { PricingCard } from "@/components/pricing/pricing-card";
import { SiteHeader } from "@/components/layout/site-header";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import type { Plan } from "@/generated/prisma/client";

const BASE_URL = "https://unmute-ai.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pricing" });

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
    languages[loc] = `${BASE_URL}${prefix}/pricing`;
  }

  const url =
    locale === routing.defaultLocale
      ? `${BASE_URL}/pricing`
      : `${BASE_URL}/${locale}/pricing`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: url, languages },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url,
      siteName: "Unmute AI",
      locale: locale.replace("-", "_"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

export default async function PricingPage() {
  const session = await auth();
  const t = await getTranslations("pricing");
  const currentPlan: Plan | undefined = session?.user?.plan;
  const plans = [PLANS.FREE, PLANS.PRO, PLANS.MAX] as const;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">{t("title")}</h2>
          <p className="text-muted-foreground text-lg">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              isLoggedIn={!!session?.user}
              popular={plan.id === "PRO"}
            />
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>{t("guarantee")}</p>
        </div>
      </main>
    </div>
  );
}
