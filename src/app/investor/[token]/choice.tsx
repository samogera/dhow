"use client";
import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { respondAsInvestor, type InvestorState } from "@/actions/investor-portal";
import { cn } from "@/lib/format";

/** Interested / Not now, with an optional note. Remembers the answer. */
export function InvestorChoice({ token, orgId, current }: { token: string; orgId: string; current?: "interested" | "not_now" | null }) {
  const [state, action, busy] = useActionState<InvestorState, FormData>(respondAsInvestor, {});
  const [note, setNote] = useState(false);
  const answer = state.response ?? current ?? null;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="org_id" value={orgId} />
      {note ? <textarea name="note" rows={2} maxLength={1000} autoFocus placeholder="A note for Dhow Partners (optional)" className="field min-h-0 resize-none text-sm" /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button name="response" value="interested" disabled={busy}
          className={cn("inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60",
            answer === "interested" ? "bg-green text-white" : "bg-navy-900 text-white hover:bg-navy-800")}>
          <Check className="size-4" />{answer === "interested" ? "Interested" : "I'm interested"}
        </button>
        <button name="response" value="not_now" disabled={busy}
          className={cn("inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-60",
            answer === "not_now" ? "border-ink/20 bg-sunken text-ink" : "border-line bg-white text-ink/70 hover:text-ink")}>
          <X className="size-4" />Not now
        </button>
        {!note ? <button type="button" onClick={() => setNote(true)} className="text-xs text-muted underline-offset-4 hover:text-ink hover:underline">Add a note</button> : null}
      </div>
      {state.error ? <p className="text-sm text-bad">{state.error}</p> : state.ok ? <p className="text-sm text-green">{state.ok}</p> : null}
    </form>
  );
}
