"use client";
import { useActionState } from "react";
import { payInvoice } from "@/actions/pay";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input } from "@/components/ui";

export function PayForm({ id, t, email, amount }: { id: string; t: string; email: string; amount: string }) {
  const [state, act] = useActionState(payInvoice, undefined);
  return (
    <form action={act} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="t" value={t} />
      <Field label="Email for your receipt"><Input name="email" type="email" required defaultValue={email} autoComplete="email" /></Field>
      <FormMessage state={state} />
      <Submit className="w-full" pending="Opening secure checkout…">Pay {amount}</Submit>
      <p className="text-center text-xs text-muted">Secure checkout by Paystack. Pay with M-Pesa or card.</p>
    </form>
  );
}
