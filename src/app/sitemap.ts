import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://unmute-ai.com";

const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1.0 },
  { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/legal/tokushoho", changeFrequency: "yearly" as const, priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of PUBLIC_ROUTES) {
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
      languages[locale] = `${BASE_URL}${prefix}${route.path === "/" ? "" : route.path}`;
    }

    entries.push({
      url: `${BASE_URL}${route.path === "/" ? "" : route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages },
    });

    for (const locale of routing.locales) {
      if (locale === routing.defaultLocale) continue;
      entries.push({
        url: `${BASE_URL}/${locale}${route.path === "/" ? "" : route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  return entries;
}
