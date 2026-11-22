"use client";
import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { makeRequest, type RequestState } from "@/actions/requests";
import { cn } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

/** "Ask Dhow to…" button that opens a short optional note, then sends the request. */
export function RequestButton({ kind, targetId, label, placeholder, done, className }: {
  kind: "member_intro" | "investor_intro" | "event_representation"; targetId: string; label: string; placeholder?: string; done?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, busy] = useActionState<RequestState, FormData>(makeRequest, {});
  if (done || state.ok) {
    return <p className="flex items-center gap-1.5 text-sm text-green"><Check className="size-4" />{state.ok ?? "Requested. We're on it."}</p>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className={cn("w-full rounded-xl border border-navy-900 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-navy-900 hover:text-white", className)}>
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="target_id" value={targetId} />
      <textarea name="note" autoFocus rows={2} maxLength={1000} placeholder={placeholder ?? "Anything we should know? (optional)"} className="field min-h-0 resize-none text-sm" />
      {state.error ? <p className="text-sm text-bad">{state.error}</p> : null}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">Cancel</button>
        <SubmitButton type="submit" disabled={busy} className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60">{busy ? "Sending…" : "Send request"}</SubmitButton>
      </div>
    </form>
  );
}
