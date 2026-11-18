import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { CtaBand, PageHero, Section, SectionHead } from "@/components/site/parts";
import { Faq } from "@/components/site/faq";
import { cn, kes } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free to join. Verification from KSh 500 by M-Pesa. Starter, Growth and Market Entry plans for companies that need more.",
};

const fee = Number(process.env.VERIFICATION_FEE_KES ?? 500);

const plans = [
  {
    name: "Free", price: "KSh 0", per: "forever", cta: { label: "Create a free account", href: "/signup" },
    blurb: "Everything you need to get set up and verified.",
    features: ["Company profile and team", "Document vault: 50 MB, 500 MB once verified", "Opportunities feed", "Apply to open opportunities", `Verification: free review, or ${kes(fee)} instant`],
  },
  {
    name: "Starter", price: kes(1000), per: "per month", cta: { label: "Talk to us", href: "/contact?plan=starter" },
    blurb: "For small teams applying regularly.",
    features: ["Everything in Free", "500 MB document vault", "Email support from the Dhow team", "Help preparing applications"],
  },
  {
    name: "Growth", price: kes(5000), per: "per month", featured: true, cta: { label: "Talk to us", href: "/contact?plan=growth" },
    blurb: "For growing companies working with partner firms.",
    features: ["Everything in Starter", "2 GB document vault", "A named Dhow contact", "Introductions to vetted partner firms", "Priority on curated opportunities"],
  },
  {
    name: "Market Entry", price: "Custom", per: "programme", cta: { label: "Plan your entry", href: "/contact?plan=market_entry" },
    blurb: "For foreign companies entering the region.",
    features: ["Everything in Growth", "10 GB document vault", "End-to-end setup and compliance", "A dedicated team", "Introductions to institutions"],
  },
];

const faq = [
  { q: "Is the Free plan really free?", a: "Yes. You can create your company, store documents, browse opportunities and get verified by manual review without paying anything." },
  { q: "How do I pay?", a: "Verification is paid by M-Pesa from your account. For monthly plans, we'll set up billing with you directly by M-Pesa or bank transfer." },
  { q: "Is company registration included in a plan?", a: "Government fees and our setup service are quoted separately, based on the structure you need. You'll get a written plan and quote before anything starts." },
  { q: "Can I change plans later?", a: "Yes. Move up or down at any time. Your documents and history stay with your company." },
];

export default function Pricing() {
  return (
    <>
      <PageHero eyebrow="Pricing" title={<>Free to join. Pay only for what you use<span className="text-mint">.</span></>}
        sub={`Start free and get verified for ${kes(fee)}, once. Upgrade when you need more storage, more support, or a full market-entry programme.`} />

      <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => (
            <article key={p.name} className={cn("flex flex-col rounded-[2rem] p-7 shadow-sm", p.featured ? "bg-navy-950 text-white ring-2 ring-mint" : "bg-white")}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">{p.name}</p>
                {p.featured ? <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-navy-950">Most popular</span> : null}
              </div>
              <p className={cn("mt-2 min-h-10 text-sm", p.featured ? "text-white/65" : "text-muted")}>{p.blurb}</p>
              <p className="num mt-6 text-4xl font-semibold tracking-tight">{p.price}</p>
              <p className={cn("text-sm", p.featured ? "text-white/60" : "text-muted")}>{p.per}</p>
              <Link href={p.cta.href} className={cn("mt-7 rounded-full py-3 text-center text-sm font-medium transition", p.featured ? "bg-mint text-navy-950 hover:bg-white" : "bg-navy-900 text-white hover:bg-navy-700")}>{p.cta.label}</Link>
              <ul className="mt-8 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3"><Check className={cn("mt-0.5 size-4 shrink-0", p.featured ? "text-mint" : "text-green")} strokeWidth={2.5} />{f}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">Prices in Kenya shillings. Government and third-party fees are quoted separately.</p>
      </section>

      <Section className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <SectionHead eyebrow="Questions" title="Pricing, answered" />
        <Faq items={faq} />
      </Section>

      <CtaBand />
    </>
  );
}
