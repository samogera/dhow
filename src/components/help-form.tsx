"use client";
import { useActionState, useState } from "react";
import { askForHelp, type HelpState } from "@/actions/help";
import { cn } from "@/lib/format";

const OTHER = "Other";
const TOPICS = {
  member: [
    "Getting verified", "Uploading documents", "Applying for an opportunity", "Writing a proposal",
    "Finding a partner", "Hiring & HR", "Marketing & branding", "Legal & compliance",
    "Entering the Kenyan market", "Events & introductions", "My plan or billing", OTHER,
  ],
  client: [
    "Project update", "Change or add to the work", "Invoice or payment", "Receipt or statement",
    "Book a meeting", "A new project", "Feedback", OTHER,
  ],
};

/** Two quick steps: what you need, then how we reach you. */
export function HelpForm({ side, name, email, phone, token, title = "How can we help?", sub, links, dark = false }: {
  side: keyof typeof TOPICS; name?: string | null; email?: string | null; phone?: string | null; token?: string;
  title?: string; sub?: string; links?: { label: string; href: string }[]; dark?: boolean;
}) {
  const [topic, setTopic] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [state, action, busy] = useActionState<HelpState, FormData>(askForHelp, {});
  const ready = !!topic && (topic !== OTHER || other.trim().length >= 3);
  const what = topic === OTHER ? other.trim() : topic;

  if (state.ok) {
    return (
      <div className="py-4 text-center">
        <p className="text-lg font-semibold tracking-tight">Thank you. We&apos;re on it.</p>
        <p className={cn("mx-auto mt-2 max-w-sm text-sm", dark ? "text-white/70" : "text-muted")}>Someone from the Dhow team will reach out within one working day.</p>
      </div>
    );
  }

  const chip = "rounded-xl border px-3 py-1.5 text-[13px] transition";
  const primary = cn("shrink-0 rounded-xl px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40", dark ? "bg-mint text-navy-950 hover:bg-white" : "bg-navy-900 text-white hover:bg-navy-800");
  const muted = dark ? "text-white/70" : "text-muted";
  const field = cn("field", dark && "border-transparent bg-white text-ink");
  return (
    <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <div className="flex items-center gap-1" aria-hidden>
          <span className={cn("h-[3px] w-6 rounded-full", dark ? "bg-mint" : "bg-navy-900")} />
          <span className={cn("h-[3px] w-6 rounded-full transition-colors", step === 2 ? (dark ? "bg-mint" : "bg-navy-900") : dark ? "bg-white/20" : "bg-line")} />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">{step === 1 ? title : "Where can we reach you?"}</h2>
        <p className={cn("mt-1 line-clamp-3 text-sm", muted)}>{step === 1 ? sub ?? "Choose one. We'll reach out within one working day." : `About: ${what}`}</p>
        {links?.length ? (
          <p className={cn("mt-4 text-xs", muted)}>
            Prefer to talk?{" "}
            {links.map((l, i) => (
              <span key={l.href}>{i ? " · " : ""}<a href={l.href} target="_blank" rel="noopener noreferrer" className={cn("font-medium underline underline-offset-4", dark ? "text-white decoration-white/40 hover:decoration-white" : "text-ink decoration-line hover:decoration-ink")}>{l.label}</a></span>
            ))}
          </p>
        ) : null}
      </div>

      {step === 1 ? (
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {TOPICS[side].map((t) => (
              <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(t)}
                className={cn(chip, dark
                  ? (topic === t ? "border-white bg-white font-medium text-navy-900" : "border-white/15 bg-white/5 text-white/85 hover:border-white/40 hover:bg-white/10")
                  : (topic === t ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-ink/80 hover:border-navy-300 hover:text-ink"))}>
                {t}
              </button>
            ))}
          </div>
          {topic === OTHER ? (
            <textarea autoFocus value={other} onChange={(e) => setOther(e.target.value)} maxLength={300} rows={2}
              placeholder="Tell us what you need, in a sentence or two" aria-label="What you need" className={cn(field, "mt-3 min-h-0 resize-none")} />
          ) : null}
          <div className="mt-4 flex justify-end">
            <button type="button" disabled={!ready} onClick={() => setStep(2)} className={primary}>Continue</button>
          </div>
        </div>
      ) : (
        <form action={action} className="min-w-0 space-y-2.5">
          <input type="hidden" name="topic" value={topic ?? ""} />
          {topic === OTHER ? <input type="hidden" name="note" value={other.trim()} /> : null}
          {token ? <input type="hidden" name="token" value={token} /> : null}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <input name="name" defaultValue={name ?? ""} required autoComplete="name" placeholder="Your name" aria-label="Your name" className={field} />
            <input name="email" type="email" defaultValue={email ?? ""} autoComplete="email" placeholder="Email" aria-label="Email" className={field} />
            <input name="phone" type="tel" defaultValue={phone ?? ""} autoComplete="tel" placeholder="Phone (optional)" aria-label="Phone" className={field} />
          </div>
          {topic !== OTHER ? <input name="note" maxLength={1000} placeholder="Anything else we should know? (optional)" aria-label="Note" className={field} /> : null}
          {state.error ? <p className={cn("text-sm", dark ? "text-amber-100" : "text-bad")}>{state.error}</p> : null}
          <div className="flex items-center justify-end gap-4 pt-1.5">
            <button type="button" onClick={() => setStep(1)} className={cn("text-sm font-medium", dark ? "text-white/70 hover:text-white" : "text-muted hover:text-ink")}>Back</button>
            <button type="submit" disabled={busy} className={primary}>{busy ? <span className="inline-flex items-center gap-2"><span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />Sending</span> : "Send"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
