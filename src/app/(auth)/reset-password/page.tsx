"use client";
import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { updatePassword } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";
import { PasswordInput } from "@/components/password-input";

export default function ResetPassword() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <>
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-mint-100 text-green"><ShieldCheck className="size-5" /></span>
      <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight text-navy-900 sm:text-[1.75rem]">Choose a new password</h1>
      <p className="mt-2 mb-7 text-center text-sm text-muted">At least 8 characters. You&apos;ll stay signed in afterwards.</p>
      <form action={action} className="space-y-3">
        <PasswordInput autoComplete="new-password" placeholder="New password" minLength={8} />
        <FormMessage state={state} />
        <Submit className="w-full py-3" pending="Saving…">Save and continue</Submit>
      </form>
    </>
  );
}
