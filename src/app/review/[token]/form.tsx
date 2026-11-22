"use client";
import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitPartnerReview } from "@/actions/profiles";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/format";

const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewForm({ token }: { token: string }) {
  const [state, act] = useActionState(submitPartnerReview, undefined);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={act} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="text-center">
        <div className="inline-flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} onClick={() => setRating(n)} className="p-1 transition hover:scale-110">
              <Star className={cn("size-9", n <= rating ? "fill-amber text-amber" : "text-line")} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm text-muted">{WORDS[rating]}</p>
      </div>
      <Field label="Your name"><Input name="reviewer_name" required /></Field>
      <Field label="Company (optional)"><Input name="reviewer_company" /></Field>
      <Field label="What went well, or what could be better?"><Textarea name="comment" rows={4} maxLength={2000} /></Field>
      <FormMessage state={state} />
      <Submit className="w-full" pending="Sending…">Send review</Submit>
    </form>
  );
}
