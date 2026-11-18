"use client";
import { useActionState } from "react";
import { applyToOpportunity } from "@/actions/member";
import { FormMessage, Submit } from "@/components/forms";

export function ApplyForm({ opportunityId }: { opportunityId: string }) {
  const [state, action] = useActionState(applyToOpportunity, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <p className="font-semibold">Express interest</p>
      <input type="hidden" name="opportunity_id" value={opportunityId} />
      <textarea name="note" maxLength={2000} placeholder="Why you're a good fit (optional)" className="field min-h-28" />
      <FormMessage state={state} />
      <Submit className="w-full" pending="Sending…">Apply</Submit>
    </form>
  );
}
