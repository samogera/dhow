"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestReset } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";

export default function ForgotPassword() {
  const [state, action] = useActionState(requestReset, undefined);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 mb-6 text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
      <form action={action} className="space-y-3">
        <input name="email" type="email" required autoComplete="email" placeholder="Your email" className="field" />
        <FormMessage state={state} />
        <Submit className="w-full py-3" pending="Sending…">Send reset link</Submit>
      </form>
      <p className="mt-6 text-center text-xs text-muted"><Link href="/login">Back to sign in</Link></p>
    </>
  );
}
