"use client";
import { useActionState, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, MessageCircleQuestion } from "lucide-react";
import { askForHelp, type HelpState } from "@/actions/help";
import { cn } from "@/lib/format";

const OTHER = "Something else";
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

/** Two quick steps: pick one or more things you need, then how we reach you. */
export function HelpForm({ side, name, email, phone, token, title = "How can we help?", sub, links }: {
  side: keyof typeof TOPICS; name?: string | null; email?: string | null; phone?: string | null; token?: string;
  title?: string; sub?: string; links?: { label: string; href: string }[]; dark?: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [state, action, busy] = useActionState<HelpState, FormData>(askForHelp, {});
  const wantsOther = picked.includes(OTHER);
  const ready = picked.length > 0 && (!wantsOther || other.trim().length >= 3);
  const toggle = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const summary = picked.filter((t) => t !== OTHER).concat(wantsOther ? [other.trim()] : []);

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-mint-100 via-white to-white p-6 ring-1 ring-mint/30 sm:p-8">
      <span aria-hidden className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-mint/20 blur-3xl" />
      {state.ok ? (
        <div className="relative flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="size-10 text-green" strokeWidth={1.75} />
          <p className="mt-3 text-lg font-semibold tracking-tight">Thank you. We&apos;re on it.</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Someone from the Dhow team will reach out within one working day.</p>
        </div>
      ) : (
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
          <div>
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-green shadow-sm ring-1 ring-mint/30"><MessageCircleQuestion className="size-5" strokeWidth={1.75} /></span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-navy-900">{step === 1 ? title : "Where can we reach you?"}</h2>
            <p className="mt-1 text-sm text-muted">{step === 1 ? sub ?? "Pick everything that applies. We reply within one working day." : "We'll use this only to reply to you."}</p>
            <ol className="mt-5 space-y-2 text-sm">
              {["What you need", "Your details"].map((s, i) => (
                <li key={s} className={cn("flex items-center gap-2.5", step === i + 1 ? "font-medium text-navy-900" : "text-muted")}>
                  <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold", step > i + 1 ? "bg-green text-white" : step === i + 1 ? "bg-navy-900 text-white" : "bg-white text-muted ring-1 ring-line")}>
                    {step > i + 1 ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>{s}
                </li>
              ))}
            </ol>
            {links?.length ? (
              <p className="mt-5 text-xs text-muted">
                Prefer to talk?{" "}
                {links.map((l, i) => (
                  <span key={l.href}>{i ? " · " : ""}<a href={l.href} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-700 underline decoration-navy-200 underline-offset-4 hover:decoration-navy-700">{l.label}</a></span>
                ))}
              </p>
            ) : null}
          </div>

          {step === 1 ? (
            <div className="min-w-0">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {TOPICS[side].map((t) => {
                  const on = picked.includes(t);
                  return (
                    <button key={t} type="button" aria-pressed={on} onClick={() => toggle(t)}
                      className={cn("flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition",
                        on ? "border-navy-900 bg-navy-900 text-white shadow-sm" : "border-line bg-white text-ink/85 hover:border-navy-300")}>
                      <span className={cn("grid size-4.5 shrink-0 place-items-center rounded-md border", on ? "border-white bg-white text-navy-900" : "border-ink/25")}>
                        {on ? <Check className="size-3" strokeWidth={3} /> : null}
                      </span>
                      {t}
                    </button>
                  );
                })}
              </div>
              {wantsOther ? (
                <textarea autoFocus value={other} onChange={(e) => setOther(e.target.value)} maxLength={300} rows={2}
                  placeholder="Tell us what you need, in a sentence or two" aria-label="What you need" className="field mt-3 min-h-0 resize-none bg-white" />
              ) : null}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">{picked.length ? `${picked.length} selected` : "Choose one or more"}</p>
                <button type="button" disabled={!ready} onClick={() => setStep(2)}
                  className="rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-30">Continue</button>
              </div>
            </div>
          ) : (
            <form action={action} className="min-w-0 space-y-3">
              <input type="hidden" name="topic" value={summary.join(", ").slice(0, 80)} />
              <input type="hidden" name="note" value={[summary.length > 1 || wantsOther ? `Needs: ${summary.join("; ")}` : "", ""].filter(Boolean).join("")} />
              {token ? <input type="hidden" name="token" value={token} /> : null}
              <div className="flex flex-wrap gap-1.5">
                {summary.map((t) => <span key={t} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-navy-800 ring-1 ring-line">{t}</span>)}
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <input name="name" defaultValue={name ?? ""} required autoComplete="name" placeholder="Your name" aria-label="Your name" className="field bg-white" />
                <input name="email" type="email" defaultValue={email ?? ""} autoComplete="email" placeholder="Email" aria-label="Email" className="field bg-white" />
                <input name="phone" type="tel" defaultValue={phone ?? ""} autoComplete="tel" placeholder="Phone (optional)" aria-label="Phone" className="field bg-white" />
              </div>
              <input name="extra" maxLength={600} placeholder="Anything else we should know? (optional)" aria-label="Anything else" className="field bg-white" />
              {state.error ? <p className="text-sm text-bad">{state.error}</p> : null}
              <div className="flex items-center justify-between gap-4 pt-1">
                <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" />Back</button>
                <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
                  {busy ? <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
                  {busy ? "Sending" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
