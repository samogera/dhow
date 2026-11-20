"use client";
import { useActionState } from "react";
import { applyToOpportunity } from "@/actions/member";
import { FormMessage, Submit } from "@/components/forms";

export function ApplyForm({ opportunityId, external = false }: { opportunityId: string; external?: boolean }) {
  const [state, action] = useActionState(applyToOpportunity, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <p className="font-semibold">{external ? "Track it in Dhow" : "Express interest"}</p>
      {external ? <p className="text-sm text-muted">Applied, or planning to? Add it to your applications so your team and Dhow can follow it.</p> : null}
      <input type="hidden" name="opportunity_id" value={opportunityId} />
      <textarea name="note" maxLength={2000} placeholder={external ? "Notes for your team (optional)" : "Why you're a good fit (optional)"} className="field min-h-28" />
      <FormMessage state={state} />
      <Submit className="w-full" variant={external ? "outline" : "primary"} pending="Saving…">{external ? "Add to my applications" : "Apply"}</Submit>
    </form>
  );
}
