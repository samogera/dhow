"use client";
import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

/** Password field with a show/hide eye, so people can check what they typed instead of guessing. */
export function PasswordInput({ name = "password", autoComplete, placeholder, minLength }: { name?: string; autoComplete: string; placeholder: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <label className="relative block">
      <Lock className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
      <input name={name} type={show ? "text" : "password"} required minLength={minLength} autoComplete={autoComplete} placeholder={placeholder} className="field pr-12 pl-11" />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </label>
  );
}
