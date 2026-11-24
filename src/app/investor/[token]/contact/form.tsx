"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, CalendarClock, CheckCircle2, CircleHelp, Compass, Handshake, LifeBuoy, Send, Target, Users } from "lucide-react";
import { sendInvestorMessage, type InvestorState } from "@/actions/investor-portal";
import { cn } from "@/lib/format";

const ICON: Record<string, typeof Building2> = {
  pipeline: Compass, company: Building2, intro: Handshake, focus: Target, partner: Users, call: CalendarClock, problem: LifeBuoy, other: CircleHelp,
};
type Me = { organisation: string; name: string; role: string; email: string; phone: string };

/** Step 1: what it's about. Step 2: their details, already filled in and editable, plus the message. */
export function ContactForm({ token, topics, startTopic, me }: { token: string; topics: Record<string, string>; startTopic: string | null; me: Me }) {
  const [picked, setPicked] = useState<string[]>(startTopic ? [startTopic] : []);
  const [other, setOther] = useState("");
  const toggle = (k: string) => setPicked((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]));
  const ready = picked.length > 0 && (!picked.includes("other") || other.trim().length > 1);
  const summary = picked.map((k) => (k === "other" ? `Other: ${other.trim()}` : topics[k])).join(" · ");
  const [step, setStep] = useState<1 | 2>(startTopic ? 2 : 1);
  const [replyBy, setReplyBy] = useState<"email" | "phone" | "whatsapp">("email");
  const [state, action, busy] = useActionState<InvestorState, FormData>(sendInvestorMessage, {});
  const field = "field mt-1 bg-white";

  if (state.ok) {
    return (
      <div className="mt-8 rounded-[1.75rem] bg-white p-8 text-center ring-1 ring-line">
        <CheckCircle2 className="mx-auto size-10 text-green" />
        <h2 className="mt-3 text-xl font-semibold tracking-tight">Message sent</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">Thank you. It&apos;s with the Dhow Partners team now, and you&apos;ll see it under Notifications on your page.</p>
        <Link href={`/investor/${token}`} className="mt-6 inline-flex rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">Back to your page</Link>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-[1.5rem] bg-white p-4 ring-1 ring-line sm:mt-8 sm:rounded-[1.75rem] sm:p-8">
      <ol className="flex items-center gap-3 text-sm">
        {(["What it's about", "Your details"] as const).map((label, i) => (
          <li key={label} className={cn("flex items-center gap-2", step === i + 1 ? "font-semibold text-navy-900" : "text-muted")}>
            <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold", step > i + 1 ? "bg-green text-white" : step === i + 1 ? "bg-navy-900 text-white" : "bg-sunken text-muted")}>{step > i + 1 ? "✓" : i + 1}</span>
            {label}
            {i === 0 ? <span aria-hidden className="mx-1 h-px w-8 bg-line" /> : null}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="mt-6">
          <h2 className="text-lg font-semibold tracking-tight">What would you like help with?</h2>
          <p className="mt-1 text-sm text-muted">Pick as many as apply.</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {Object.entries(topics).map(([k, label]) => {
              const Icon = ICON[k] ?? CircleHelp;
              return (
                <button key={k} type="button" onClick={() => toggle(k)} aria-pressed={picked.includes(k)}
                  className={cn("flex items-center gap-3 rounded-2xl border p-3.5 text-left text-sm transition sm:p-4", picked.includes(k) ? "border-navy-900 bg-navy-50 ring-1 ring-navy-900" : "border-line hover:border-navy-300 hover:bg-sunken")}>
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", picked.includes(k) ? "bg-navy-900 text-white" : "bg-sunken text-navy-700")}><Icon className="size-4" /></span>
                  <span className="flex-1 font-medium">{label}</span>
                  <span aria-hidden className={cn("grid size-5 place-items-center rounded-md border text-[11px]", picked.includes(k) ? "border-navy-900 bg-navy-900 text-white" : "border-line")}>{picked.includes(k) ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
          {picked.includes("other") ? (
            <label className="mt-4 block text-sm">What&apos;s it about?<input value={other} onChange={(e) => setOther(e.target.value)} maxLength={120} autoFocus placeholder="Type your topic" className={field} /></label>
          ) : null}
          <div className="sticky bottom-0 -mx-4 mt-6 flex justify-end border-t border-line bg-white px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
            <button type="button" disabled={!ready} onClick={() => setStep(2)} className="inline-flex w-full items-center justify-center gap-2 sm:w-auto rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-40">
              Next<ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <form action={action} className="mt-6 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="token" value={token} />
          {picked.map((k) => <input key={k} type="hidden" name="topic" value={k} />)}
          <input type="hidden" name="other_topic" value={other} />
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-sunken px-4 py-3 text-sm sm:col-span-2">
            <span><span className="text-muted">About: </span><b>{summary}</b></span>
            <button type="button" onClick={() => setStep(1)} className="text-navy-600 hover:underline">Change</button>
          </div>
          <p className="mt-2 text-xs text-muted sm:col-span-2">We&apos;ve filled in your details. Change anything that&apos;s not right.</p>
          <label className="text-sm">Organisation<input name="organisation" required defaultValue={me.organisation} className={field} /></label>
          <label className="text-sm">Your name<input name="name" required defaultValue={me.name} className={field} /></label>
          <label className="text-sm">Role<input name="role" defaultValue={me.role} placeholder="Investment manager" className={field} /></label>
          <label className="text-sm">Email<input name="email" type="email" required defaultValue={me.email} placeholder="you@fund.com" className={field} /></label>
          <label className="text-sm">Phone<input name="phone" type="tel" required={replyBy !== "email"} defaultValue={me.phone} placeholder="+254 700 000 000" className={field} /></label>
          <fieldset className="text-sm">
            <legend>Best way to reply</legend>
            <div className="mt-1 flex gap-1.5">
              {(["email", "phone", "whatsapp"] as const).map((r) => (
                <label key={r} className={cn("flex-1 cursor-pointer rounded-xl border px-3 py-2.5 text-center capitalize", replyBy === r ? "border-navy-900 bg-navy-50 font-medium" : "border-line")}>
                  <input type="radio" name="reply_by" value={r} checked={replyBy === r} onChange={() => setReplyBy(r)} className="sr-only" />{r === "whatsapp" ? "WhatsApp" : r}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-sm sm:col-span-2">Your message<textarea name="message" required rows={6} maxLength={3000} autoFocus placeholder="Tell us the question or challenge, and anything that helps us answer it." className={`${field} min-h-0`} /></label>
          {state.error ? <p className="text-sm text-bad sm:col-span-2">{state.error}</p> : null}
          <div className="mt-2 flex items-center justify-between gap-3 sm:col-span-2">
            <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Back</button>
            <button disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 sm:flex-none py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
              {busy ? <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="size-4" />}{busy ? "Sending" : "Send to Dhow Partners"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
