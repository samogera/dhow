/**
 * The site's public address, with no trailing slash.
 * Uses NEXT_PUBLIC_APP_URL (or NEXT_APP_URL / APP_URL) when set; otherwise Vercel's own
 * production domain, so a fresh deployment works without configuring it.
 */
export function appUrl(): string {
  const env = process.env;
  const set = env.NEXT_PUBLIC_APP_URL || env.NEXT_APP_URL || env.APP_URL;
  if (set && /^https?:\/\//.test(set.trim())) return set.trim().replace(/\/+$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
