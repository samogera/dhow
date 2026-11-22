"use client";
import { useEffect } from "react";
import { CenteredShell } from "@/components/centered-shell";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: (error.message || "Error").slice(0, 500), digest: error.digest, path: location.pathname }),
    }).catch(() => undefined);
  }, [error]);
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
