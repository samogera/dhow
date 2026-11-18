import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Fixed-window limit stored in Postgres. Returns true while the caller is under the limit. */
export async function rateLimit(bucket: string, max: number, windowSeconds = 60): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: `${bucket}:${ip}`,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) return true; // fail open on infrastructure errors, never block real users silently
  return data === true;
}
