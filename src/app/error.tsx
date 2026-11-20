"use client";
import { useEffect } from "react";
import { CenteredShell } from "@/components/centered-shell";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
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
