/**
import { appUrl } from "@/lib/app-url";
 * The site's public address, with no trailing slash.
 * Uses NEXT_PUBLIC_APP_URL (or NEXT_APP_URL / APP_URL) when set; otherwise Vercel's own
 * production domain, so a fresh deployment works without configuring it.
 */
export function appUrl(): string {
  const set = appUrl() || process.env.NEXT_APP_URL || process.env.APP_URL;
  if (set) return set.trim().replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
