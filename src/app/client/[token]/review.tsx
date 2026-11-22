"use client";
import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitClientReview } from "@/actions/profiles";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/format";

export function ClientReviewForm({ token }: { token: string }) {
  const [state, act] = useActionState(submitClientReview, undefined);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={act} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} onClick={() => setRating(n)} className="p-0.5 transition hover:scale-110">
            <Star className={cn("size-8", n <= rating ? "fill-amber text-amber" : "text-line")} />
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name"><Input name="reviewer_name" required /></Field>
      </div>
      <Field label="Comments"><Textarea name="comment" rows={3} maxLength={2000} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="may_publish" className="size-4 accent-navy-900" />Dhow Partners may share this review publicly</label>
      <FormMessage state={state} />
      <Submit pending="Sending…">Send review</Submit>
    </form>
  );
}
