"use client";
import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { sendEnquiry } from "@/actions/site";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { CONTACT_TOPICS } from "@/components/site/nav";

export function ContactForm({ defaultTopic, plan }: { defaultTopic?: string; plan?: string }) {
  const [state, act] = useActionState(sendEnquiry, undefined);

  if (state?.ok) {
    return (
      <div className="grid min-h-80 place-items-center text-center">
        <div>
          <CheckCircle2 className="mx-auto size-12 text-green" />
          <p className="mt-5 text-2xl font-semibold tracking-tight">Message sent</p>
          <p className="mx-auto mt-2 max-w-sm text-muted">{state.ok}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={act} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="text-2xl font-semibold tracking-tight">Send us a message</p>
        <p className="mt-1 text-sm text-muted">Fields marked * are required.</p>
      </div>
      <Field label="Your name *"><Input name="name" required autoComplete="name" /></Field>
      <Field label="Email *"><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Phone"><Input name="phone" type="tel" autoComplete="tel" placeholder="+254 7…" /></Field>
      <Field label="Company"><Input name="company" autoComplete="organization" /></Field>
      <div className="sm:col-span-2">
        <Field label="What can we help with? *">
          <Select name="service" required defaultValue={defaultTopic ?? ""}>
            <option value="" disabled>Choose one</option>
            {CONTACT_TOPICS.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Your message *">
          <Textarea name="message" required rows={5} minLength={10} defaultValue={plan ? `I'm interested in the ${plan.replace("_", " ")} plan.` : ""} placeholder="What are you planning, and when?" />
        </Field>
      </div>
      {/* Honeypot: hidden from people, filled by bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
        <p className="text-xs text-muted">We use your details only to reply. See our <Link href="/privacy" className="underline">privacy policy</Link>.</p>
        <Submit pending="Sending…">Send message</Submit>
      </div>
    </form>
  );
}
