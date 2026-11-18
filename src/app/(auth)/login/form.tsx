"use client";
import { useActionState } from "react";
import { Lock, Mail } from "lucide-react";
import { signIn } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="relative block">
        <Mail className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
        <input name="email" type="email" required autoComplete="email" placeholder="Your email" className="field pl-11" />
      </label>
      <label className="relative block">
        <Lock className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Your password" className="field pl-11" />
      </label>
      <FormMessage state={state} />
      <Submit className="w-full py-3" pending="Signing in…">Sign in</Submit>
    </form>
  );
}
