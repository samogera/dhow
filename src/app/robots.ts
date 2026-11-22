import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

// Only the public pages (sign-in, help, terms, privacy) may be listed by search engines.
// Workspaces, private partner and client links, payment pages and the API stay out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/login", "/help", "/terms", "/privacy"],
      disallow: ["/admin", "/app", "/api", "/partner", "/client", "/investor", "/review", "/pay", "/onboarding", "/invite", "/closed", "/auth", "/reset", "/signup"],
    }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
