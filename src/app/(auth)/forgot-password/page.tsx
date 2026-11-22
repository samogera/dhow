"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { KeyRound, Mail, MailCheck } from "lucide-react";
import { requestReset } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";
import { CodeEntry } from "@/components/code-entry";

export default function ForgotPassword() {
  const [state, action] = useActionState(requestReset, undefined);
  const [email, setEmail] = useState("");
  if (state?.ok) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-100 text-green"><MailCheck className="size-6" /></span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted">If <span className="font-medium text-ink">{email}</span> has an account, we sent a link to choose a new password. Click it, or type the code.</p>
        <CodeEntry email={email} kind="recovery" />
        <p className="mt-5 text-sm text-muted"><Link href="/login" className="font-medium text-navy-600">Back to sign in</Link></p>
      </div>
    );
  }
  return (
    <>
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-navy-50 text-navy-700"><KeyRound className="size-5" /></span>
      <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight text-navy-900 sm:text-[1.75rem]">Forgot your password?</h1>
      <p className="mt-2 mb-7 text-center text-sm text-muted">No problem. Enter your email and we&apos;ll send you a way back in.</p>
      <form action={action} className="space-y-3">
        <label className="relative block">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="email" type="email" required autoFocus autoComplete="email" inputMode="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className="field pl-11" />
        </label>
        <FormMessage state={state} />
        <Submit className="w-full py-3" pending="Sending…">Send me a reset link</Submit>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Remembered it? <Link href="/login" className="font-semibold text-navy-600">Sign in</Link></p>
    </>
  );
}
