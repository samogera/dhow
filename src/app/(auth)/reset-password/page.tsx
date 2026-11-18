"use client";
import { useActionState } from "react";
import { updatePassword } from "@/actions/auth";
import { FormMessage, Submit } from "@/components/forms";

export default function ResetPassword() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-2 mb-6 text-sm text-muted">Use at least 10 characters.</p>
      <form action={action} className="space-y-3">
        <input name="password" type="password" required minLength={10} autoComplete="new-password" placeholder="New password" className="field" />
        <FormMessage state={state} />
        <Submit className="w-full py-3">Save password</Submit>
      </form>
    </>
  );
}
