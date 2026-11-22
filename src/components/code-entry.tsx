"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { verifyEmailCode } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";
import { cn } from "@/lib/format";

const MAX = 8;

/**
 * The emailed code, shown as separate boxes. One real input underneath, so:
 * autocomplete="one-time-code" lets phones offer the code from the notification,
 * pasting the whole code works, and a Paste button reads it from the clipboard.
 */
export function CodeEntry({ email, kind, next, length = 6 }: { email: string; kind: "signup" | "email" | "recovery"; next?: string; length?: number }) {
  const [state, action] = useActionState(verifyEmailCode, undefined);
  const [code, setCode] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const slots = Math.min(MAX, Math.max(length, code.length));
  const set = (v: string) => setCode(v.replace(/\D/g, "").slice(0, MAX));

  // Submit by itself once a full 8-digit code is in (6-digit codes need a tap, since the length can vary).
  useEffect(() => { if (code.length === MAX) form.current?.requestSubmit(); }, [code]);

  async function paste() {
    try { set(await navigator.clipboard.readText()); input.current?.focus(); } catch { input.current?.focus(); }
  }

  return (
    <form ref={form} action={action} className="mt-5 space-y-3 text-left">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="next" value={next ?? ""} />
      <p className="text-center text-sm font-medium">Or enter the code from the email</p>
      <div className="relative" onClick={() => input.current?.focus()}>
        <div aria-hidden className="flex justify-center gap-1.5 sm:gap-2">
          {Array.from({ length: slots }).map((_, i) => (
            <span key={i} className={cn("grid h-14 w-11 place-items-center rounded-2xl border bg-sunken text-2xl font-semibold text-navy-900 transition sm:w-12",
              i === code.length ? "border-navy-500 bg-white ring-2 ring-navy-100" : code[i] ? "border-navy-200 bg-white" : "border-line")}>
              {code[i] ?? ""}
            </span>
          ))}
        </div>
        <input ref={input} name="token" value={code} onChange={(e) => set(e.target.value)} required autoComplete="one-time-code" inputMode="numeric"
          aria-label="Code from the email" className="absolute inset-0 h-full w-full cursor-text opacity-0" />
      </div>
      <button type="button" onClick={paste} className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-navy-600 hover:bg-sunken">
        <ClipboardPaste className="size-4" />Paste code
      </button>
      <FormMessage state={state} />
      <Submit className="w-full py-3" pending="Checking…">Continue</Submit>
    </form>
  );
}
