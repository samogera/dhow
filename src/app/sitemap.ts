import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";
import { ARTICLES } from "@/content/help";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const now = new Date();
  return [
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/help`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...ARTICLES.filter((a) => a.audience === "member").map((a) => ({ url: `${base}/help/${a.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 })),
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
