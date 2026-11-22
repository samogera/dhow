"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Mail, MailCheck } from "lucide-react";
import { sendSignInLink, signIn } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";
import { PasswordInput } from "@/components/password-input";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  const [linkState, linkAction] = useActionState(sendSignInLink, undefined);
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");

  if (linkState?.ok) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-100 text-green"><MailCheck className="size-6" /></span>
        <p className="mt-4 font-semibold text-navy-900">Check your inbox</p>
        <p className="mt-1 text-sm text-muted">We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. Open it on this device to sign in. It works for one hour.</p>
        <button type="button" onClick={() => location.reload()} className="mt-5 text-sm font-medium text-navy-600">Use a different email</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form action={mode === "password" ? action : linkAction} className="space-y-3">
        <input type="hidden" name="next" value={next ?? ""} />
        <label className="relative block">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="email" type="email" required autoComplete="email" inputMode="email" autoFocus placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className="field pl-11" />
        </label>
        {mode === "password" ? <PasswordInput autoComplete="current-password" placeholder="Your password" /> : null}
        {mode === "password" ? (
          <div className="flex justify-end"><Link href="/forgot-password" className="text-xs text-muted hover:text-ink">Forgot password?</Link></div>
        ) : null}
        <FormMessage state={mode === "password" ? state : linkState} />
        <Submit className="w-full py-3" pending={mode === "password" ? "Signing in…" : "Sending…"}>{mode === "password" ? "Sign in" : "Email me a sign-in link"}</Submit>
      </form>
      <div className="flex items-center gap-3 py-1 text-xs text-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <button type="button" onClick={() => setMode((m) => (m === "password" ? "link" : "password"))}
        className="w-full rounded-full border border-line bg-white py-3 text-sm font-medium text-ink transition hover:bg-sunken">
        {mode === "password" ? "Sign in without a password" : "Sign in with my password"}
      </button>
    </div>
  );
}
