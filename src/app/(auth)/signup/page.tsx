"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Check, Mail, MailCheck, User } from "lucide-react";
import { signUp } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";
import { PasswordInput } from "@/components/password-input";
import { CodeEntry } from "@/components/code-entry";

const GAINS = ["Opportunities picked for companies in Kenya", "Trusted partner firms for setup and growth", "Get Dhow Verified to win trust"];

export default function SignUp() {
  const [state, action] = useActionState(signUp, undefined);
  const [email, setEmail] = useState("");
  // Coming from the "next steps" email: the address is filled in already.
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("email");
    if (e) setEmail(e.slice(0, 200));
  }, []);

  if (state?.ok) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-100 text-green"><MailCheck className="size-6" /></span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy-900">One last step</h1>
        <p className="mt-2 text-sm text-muted">We sent an email to <span className="font-medium text-ink">{email || "your email"}</span>. Click the link in it, or type the code below, and you&apos;re in.</p>
        <CodeEntry email={email} kind="signup" />
        <p className="mt-4 text-xs text-faint">Not there after a minute? Check your spam or promotions folder.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="rounded-full bg-navy-900 px-5 py-2.5 text-sm font-medium text-white">Open Gmail</a>
          <a href="https://outlook.live.com/mail" target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium">Open Outlook</a>
        </div>
        <button type="button" onClick={() => location.reload()} className="mt-5 text-sm text-muted hover:text-ink">Used the wrong email? Start again</button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-navy-900 sm:text-[1.75rem]">Create your free account</h1>
      <p className="mt-2 text-center text-sm text-muted">It takes about a minute.</p>
      <ul className="mx-auto mt-5 mb-7 w-fit space-y-1.5 text-sm text-ink/80">
        {GAINS.map((g) => <li key={g} className="flex items-center gap-2"><Check className="size-4 shrink-0 text-green" />{g}</li>)}
      </ul>
      <form action={action} className="space-y-3">
        <label className="relative block">
          <User className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="full_name" required autoComplete="name" autoFocus placeholder="Your name" className="field pl-11" />
        </label>
        <label className="relative block">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="field pl-11" />
        </label>
        <PasswordInput autoComplete="new-password" placeholder="Choose a password (8+ characters)" minLength={8} />
        <FormMessage state={state} />
        <Submit variant="accent" className="w-full py-3" pending="Creating your account…">Create account</Submit>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-navy-600 hover:text-navy-900">Sign in</Link></p>
      <p className="mt-3 text-center text-xs text-faint">
        By creating an account you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </>
  );
}
