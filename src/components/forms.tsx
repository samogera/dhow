"use client";
import { useActionState, useContext, useEffect, useRef } from "react";
import { DrawerContext } from "@/components/drawer";
import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui";

export function Submit({ children, pending, ...p }: ComponentProps<typeof Button> & { pending?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <Button type="submit" disabled={busy} {...p}>
      {busy ? pending ?? "Saving…" : children}
    </Button>
  );
}

export type ActionState = { error?: string; ok?: string } | undefined;

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p role="status" className={state.error ? "rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad" : "rounded-2xl bg-good/10 px-4 py-3 text-sm text-good"}>
      {state.error ?? state.ok}
    </p>
  );
}

/** Wraps a server action with pending state and inline success or error messages. */
export function ActionForm({
  action, children, submit = "Save", className, submitVariant,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
  submitVariant?: ComponentProps<typeof Button>["variant"];
}) {
  const [state, act] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const drawer = useContext(DrawerContext);
  useEffect(() => {
    if (!state?.ok) return;
    ref.current?.reset();
    if (drawer) { const t = setTimeout(drawer.close, 700); return () => clearTimeout(t); }
  }, [state, drawer]);
  return (
    <form ref={ref} action={act} className={className ?? "space-y-4"}>
      {children}
      <FormMessage state={state} />
      <Submit variant={submitVariant}>{submit}</Submit>
    </form>
  );
}

/** A small button that asks before a destructive action. */
export function ConfirmSubmit({ message, children, ...p }: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      type="submit"
      {...p}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
