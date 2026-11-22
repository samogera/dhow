"use client";
import { useEffect } from "react";

/** Last-resort error screen, used when the main layout itself fails. Plain HTML so it can't fail too. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message.slice(0, 500), digest: error.digest, path: location.pathname }),
    }).catch(() => undefined);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f3f5f7", color: "#0d1c29" }}>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#3b4855", lineHeight: 1.5 }}>
            Please try again. If it keeps happening, email hello@dhowpartners.com{error.digest ? ` and quote reference ${error.digest}` : ""}.
          </p>
          <button onClick={() => reset()} style={{ marginTop: 16, background: "#00395f", color: "#fff", border: 0, borderRadius: 999, padding: "12px 22px", fontSize: 15, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
