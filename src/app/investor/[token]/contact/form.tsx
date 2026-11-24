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
  const [topic, setTopic] = useState<string | null>(startTopic);
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
    <div className="mt-8 rounded-[1.75rem] bg-white p-5 ring-1 ring-line sm:p-8">
      <ol className="flex items-center gap-3 text-sm">
        {(["What it's about", "Your details and message"] as const).map((label, i) => (
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
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {Object.entries(topics).map(([k, label]) => {
              const Icon = ICON[k] ?? CircleHelp;
              return (
                <button key={k} type="button" onClick={() => setTopic(k)}
                  className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left text-sm transition", topic === k ? "border-navy-900 bg-navy-50 ring-1 ring-navy-900" : "border-line hover:border-navy-300 hover:bg-sunken")}>
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", topic === k ? "bg-navy-900 text-white" : "bg-sunken text-navy-700")}><Icon className="size-4" /></span>
                  <span className="font-medium">{label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" disabled={!topic} onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-40">
              Next<ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <form action={action} className="mt-6 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="topic" value={topic ?? "other"} />
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-sunken px-4 py-3 text-sm sm:col-span-2">
            <span><span className="text-muted">About: </span><b>{topic ? topics[topic] : ""}</b></span>
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
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
              {busy ? <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="size-4" />}{busy ? "Sending" : "Send to Dhow Partners"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
