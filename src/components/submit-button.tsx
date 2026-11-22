"use client";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/format";

/** A submit button that shows a spinner while the form saves, then a tick for a moment so you know it worked. */
export function SubmitButton({ children, className, disabled, ...p }: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  const [done, setDone] = useState(false);
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending) {
      setDone(true);
      const t = setTimeout(() => setDone(false), 1600);
      return () => clearTimeout(t);
    }
    was.current = pending;
  }, [pending]);
  return (
    <button {...p} type={p.type ?? "submit"} disabled={disabled || pending} aria-busy={pending || undefined}
      className={cn(className, !/(^|\s)(inline-)?(flex|grid)(\s|$)/.test(className ?? "") && "inline-flex items-center justify-center gap-1.5", "disabled:cursor-wait", pending && "opacity-80")}>
      {pending ? <span aria-hidden className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" /> : done ? <Check aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} /> : null}
      {children}
    </button>
  );
}
