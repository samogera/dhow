"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Lock, Mail, User } from "lucide-react";
import { signUp } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";

export default function SignUp() {
  const [state, action] = useActionState(signUp, undefined);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 mb-6 text-sm text-muted">Create a free account for your company.</p>
      <form action={action} className="space-y-3">
        <label className="relative block">
          <User className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="full_name" required autoComplete="name" placeholder="Your full name" className="field pl-11" />
        </label>
        <label className="relative block">
          <Mail className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="email" type="email" required autoComplete="email" placeholder="Work email" className="field pl-11" />
        </label>
        <label className="relative block">
          <Lock className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="password" type="password" required minLength={10} autoComplete="new-password" placeholder="Password, 10+ characters" className="field pl-11" />
        </label>
        <FormMessage state={state} />
        <Submit variant="accent" className="w-full py-3" pending="Creating…">Sign up</Submit>
      </form>
      <p className="mt-6 text-center text-xs text-muted">
        Already have an account? <Link href="/login" className="font-medium text-ink">Sign in</Link>
      </p>
      <p className="mt-3 text-center text-[11px] text-faint">
        By signing up you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </>
  );
}
