"use client";
import { useActionState } from "react";
import { verifyEmailCode } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";

/** One box for the emailed code. autocomplete="one-time-code" lets phones offer the code from the notification. */
export function CodeEntry({ email, kind, next }: { email: string; kind: "signup" | "email" | "recovery"; next?: string }) {
  const [state, action] = useActionState(verifyEmailCode, undefined);
  return (
    <form action={action} className="mt-5 space-y-3 text-left">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block">
        <span className="mb-1.5 block text-center text-sm font-medium">Or type the code from the email</span>
        <input name="token" required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9 ]{6,9}" maxLength={9} placeholder="123456"
          className="field text-center text-2xl font-semibold tracking-[0.4em] placeholder:tracking-[0.4em] placeholder:text-line" />
      </label>
      <FormMessage state={state} />
      <Submit className="w-full py-3" pending="Checking…">Continue</Submit>
    </form>
  );
}
