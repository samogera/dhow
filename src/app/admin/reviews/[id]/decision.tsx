"use client";
import { useActionState } from "react";
import { reviewVerification } from "@/actions/admin";
import { FormMessage, Submit } from "@/components/forms";

export function DecisionForm({ id }: { id: string }) {
  const [state, action] = useActionState(reviewVerification, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <textarea name="note" maxLength={1000} placeholder="Note to the member (required when rejecting)" className="field min-h-24" />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <Submit name="decision" value="verified" variant="accent" className="flex-1">Verify</Submit>
        <Submit name="decision" value="rejected" variant="danger" className="flex-1">Reject</Submit>
      </div>
    </form>
  );
}
