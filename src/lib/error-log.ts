import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Row = { source: "server" | "browser"; message: string; digest?: string | null; path?: string | null; detail?: Record<string, unknown> };

/** Writes one error to the app_errors table and the hosting log. Never throws. */
export async function logError(row: Row) {
  const clean = {
    source: row.source,
    message: String(row.message || "Unknown error").slice(0, 500),
    digest: row.digest ? String(row.digest).slice(0, 80) : null,
    path: row.path ? String(row.path).slice(0, 300) : null,
    detail: row.detail ?? null,
  };
  console.error("[app-error]", JSON.stringify(clean));
  try {
    await createAdminClient().from("app_errors").insert(clean);
  } catch {
    // The table may not exist yet (migration not run). The hosting log still has it.
  }
}
