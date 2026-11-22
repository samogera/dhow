import type { Instrumentation } from "next";

export async function register() {}

/** Every server error (pages, server actions, API routes) is recorded in app_errors. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/error-log");
  const e = err as Error & { digest?: string };
  await logError({
    source: "server",
    message: e?.message ?? String(err),
    digest: e?.digest,
    path: request.path,
    detail: { method: request.method, route: context.routePath, kind: context.routerKind, type: context.routeType },
  });
};
