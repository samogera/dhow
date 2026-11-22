"use client";
import { useEffect } from "react";
import { CenteredShell } from "@/components/centered-shell";
import { Button, ButtonLink } from "@/components/ui";

// After an update goes live, a page opened before it can call server code that no longer exists.
// That isn't a real failure: reload once onto the new version instead of showing an error.
const STALE = /Server Action .* was not found|failed-to-find-server-action|Failed to find Server Action|ChunkLoadError|Loading chunk .* failed/i;

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = STALE.test(error.message ?? "");
  useEffect(() => {
    if (stale) {
      try {
        if (!sessionStorage.getItem("dhow-reloaded")) { sessionStorage.setItem("dhow-reloaded", "1"); location.reload(); return; }
      } catch { /* storage blocked: show the message below */ }
    }
    console.error(error);
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: (error.message || "Error").slice(0, 500), digest: error.digest, path: location.pathname }),
    }).catch(() => undefined);
  }, [error, stale]);
  if (stale) {
    return (
      <CenteredShell>
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Dhow was just updated</h1>
          <p className="mt-2 text-muted">Reload the page to carry on. If you were typing a code, request a fresh one if needed.</p>
          <div className="mt-8 flex justify-center"><Button onClick={() => location.reload()}>Reload</Button></div>
        </div>
      </CenteredShell>
    );
  }
  return (
    <CenteredShell>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Something went wrong</h1>
        <p className="mt-2 text-muted">Please try again. If it keeps happening, email hello@dhowpartners.com{error.digest ? ` and quote reference ${error.digest}` : ""}.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <ButtonLink href="/" variant="outline">Go home</ButtonLink>
        </div>
      </div>
    </CenteredShell>
  );
}
