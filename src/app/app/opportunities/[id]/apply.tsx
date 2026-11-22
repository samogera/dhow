"use client";
import { useActionState, useState } from "react";
import { applyToOpportunity } from "@/actions/member";
import { FormMessage, Submit } from "@/components/forms";
import { cn } from "@/lib/format";

const STAGES = [
  { value: "interested", label: "Interested" },
  { value: "started", label: "Started" },
  { value: "submitted", label: "Submitted" },
] as const;

export function ApplyForm({ opportunityId, external = false }: { opportunityId: string; external?: boolean }) {
  const [state, action] = useActionState(applyToOpportunity, undefined);
  const [stage, setStage] = useState<(typeof STAGES)[number]["value"]>("interested");
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <p className="font-semibold">Track it in My applications</p>
      <p className="text-sm text-muted">{external ? "Where are you with this one? You can change it any time." : "Where are you with this one? Dhow follows up on submitted ones."}</p>
      <input type="hidden" name="opportunity_id" value={opportunityId} />
      <input type="hidden" name="stage" value={stage} />
      <div role="radiogroup" aria-label="Stage" className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
        {STAGES.map((s) => (
          <button key={s.value} type="button" role="radio" aria-checked={stage === s.value} onClick={() => setStage(s.value)}
            className={cn("rounded-lg px-2 py-1.5 text-[13px] transition", stage === s.value ? "bg-white font-semibold text-ink shadow-sm" : "text-ink/65 hover:text-ink")}>
            {s.label}
          </button>
        ))}
      </div>
      <textarea name="note" maxLength={2000} placeholder="Notes for your team (optional)" className="field min-h-20" />
      <FormMessage state={state} />
      <Submit className="w-full" variant={external ? "outline" : "primary"} pending="Saving…">Add to My applications</Submit>
    </form>
  );
}
