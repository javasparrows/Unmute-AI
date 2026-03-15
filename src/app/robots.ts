import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/documents/", "/papers/", "/settings/", "/admin/", "/login"],
      },
    ],
    sitemap: "https://unmute-ai.com/sitemap.xml",
  };
}
