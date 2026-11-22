import type { Metadata } from "next";
import { appUrl } from "@/lib/app-url";

/** Link-preview tags for private links shared on WhatsApp, email and Slack: our title, a clear line, and the Dhow card. */
export function shareMeta(title: string, description: string, path: string): Metadata {
  const base = appUrl() ?? "https://workspace.dhowpartners.com";
  const image = { url: `${base}/og.jpg`, width: 1200, height: 630, alt: "Dhow Partners" };
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: { type: "website", siteName: "Dhow Partners", locale: "en_KE", title, description, url: `${base}${path}`, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
