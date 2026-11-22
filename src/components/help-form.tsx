"use client";
import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, FileQuestion, Handshake, MessageSquare, Receipt, Rocket, Send, Sparkles } from "lucide-react";
import { askForHelp, type HelpState } from "@/actions/help";
import { cn } from "@/lib/format";

const TOPICS = {
  member: [
    { label: "Getting set up", hint: "Documents, verification, settings", icon: BadgeCheck },
    { label: "Applying for an opportunity", hint: "A grant, programme or tender", icon: Send },
    { label: "Finding a partner", hint: "HR, marketing, legal, travel and more", icon: Handshake },
    { label: "Something else", hint: "Anything on your mind", icon: MessageSquare },
  ],
  client: [
    { label: "A question about my project", hint: "Progress, timelines, changes", icon: FileQuestion },
    { label: "An invoice or payment", hint: "Amounts, receipts, how to pay", icon: Receipt },
    { label: "New work", hint: "Something more we can help with", icon: Rocket },
    { label: "Something else", hint: "Anything on your mind", icon: Sparkles },
  ],
};

/** Two quick steps: pick what you need, then confirm how we reach you. */
export function HelpForm({ side, name, email, phone, token, title = "Need a hand?", sub }: {
  side: keyof typeof TOPICS; name?: string | null; email?: string | null; phone?: string | null; token?: string; title?: string; sub?: string;
}) {
  const topics = TOPICS[side];
  const [topic, setTopic] = useState<string | null>(null);
  const [state, action, busy] = useActionState<HelpState, FormData>(askForHelp, {});

  if (state.ok) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-green text-white"><Check className="size-6" /></span>
        <p className="mt-4 text-lg font-semibold">Got it, thank you</p>
        <p className="mt-1 max-w-xs text-sm text-muted">Someone from the Dhow team will reach out within one working day.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold tracking-tight">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{topic ? "How should we reach you?" : sub ?? "Tell us what you need. We'll reach out."}</p>
        </div>
        <span className="shrink-0 rounded-full bg-sunken px-2.5 py-1 text-xs font-medium text-muted">Step {topic ? 2 : 1} of 2</span>
      </div>

      {!topic ? (
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {topics.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setTopic(t.label)}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-left transition hover:border-navy-300 hover:bg-sunken/50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700"><t.icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-xs text-muted">{t.hint}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </button>
          ))}
        </div>
      ) : (
        <form action={action} className="mt-5 space-y-3">
          <input type="hidden" name="topic" value={topic} />
          {token ? <input type="hidden" name="token" value={token} /> : null}
          <button type="button" onClick={() => setTopic(null)} className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1 text-xs font-medium text-navy-800">
            <ArrowLeft className="size-3.5" />{topic}
          </button>
          <input name="name" defaultValue={name ?? ""} required autoComplete="name" placeholder="Your name" aria-label="Your name" className="field" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input name="email" type="email" defaultValue={email ?? ""} autoComplete="email" placeholder="Email" aria-label="Email" className="field" />
            <input name="phone" type="tel" defaultValue={phone ?? ""} autoComplete="tel" placeholder="Phone (optional)" aria-label="Phone" className="field" />
          </div>
          <textarea name="note" rows={2} placeholder="Anything we should know? (optional)" aria-label="Note" className="field min-h-0 resize-none" />
          {state.error ? <p className="rounded-2xl bg-bad/10 px-4 py-2.5 text-sm text-bad">{state.error}</p> : null}
          <button type="submit" disabled={busy} className={cn("inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800", busy && "opacity-70")}>
            {busy ? "Sending…" : "Ask Dhow to reach out"}
          </button>
        </form>
      )}
    </div>
  );
}
