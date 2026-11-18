import type { Metadata } from "next";
import { BadgeCheck, Building2, Check, Compass, Handshake, Megaphone } from "lucide-react";
import { CtaBand, CtaLink, PageHero, Section } from "@/components/site/parts";

export const metadata: Metadata = {
  title: "Services",
  description: "Company setup, Dhow Verified, vetted partner firms, curated opportunities and full market-entry programmes for Kenya and East Africa.",
};

const services = [
  {
    id: "setup", icon: Building2, title: "Company setup",
    lead: "Get properly registered from day one, without the back-and-forth.",
    body: "We work out the right structure with you, prepare and file everything, and keep you updated through one named contact. You get a written plan within 48 hours of our first call.",
    points: ["Business name or limited company registration", "KRA PIN and tax obligations explained plainly", "County business permits", "All documents stored safely in your Dhow vault"],
  },
  {
    id: "verified", icon: BadgeCheck, title: "Dhow Verified",
    lead: "Show partners and buyers your company is registered and real.",
    body: "Upload your documents for a free review by our team, or pay by M-Pesa for an instant automated check. Verified companies can apply to opportunities that are open only to them.",
    points: ["Free manual review, or instant check by M-Pesa", "Registration checked against official records", "Badge valid for 12 months", "Unlocks verified-only opportunities", "More document storage once verified"],
    href: "/verified",
  },
  {
    id: "partners", icon: Handshake, title: "Vetted partner firms",
    lead: "The right lawyer, accountant, bank or recruiter, already checked.",
    body: "Every partner firm passes four checks before it gets work through Dhow. We coordinate the work, so you deal with one person, not five.",
    points: ["Lawyers and company secretaries", "Accountants and tax advisers", "Banks and payment providers", "Recruiters and HR", "Clear terms agreed before any work starts"],
  },
  {
    id: "opportunities", icon: Megaphone, title: "Opportunities",
    lead: "RFPs, tenders, grants and events worth your time.",
    body: "We collect opportunities from institutions, development partners, chambers and embassies, then post the ones that fit our members. Apply in a few clicks from your account and track every application.",
    points: ["Curated RFPs, tenders and grants", "Events and trade programmes", "Deadline reminders", "Track application status in one place", "Some opportunities open only to verified companies"],
  },
  {
    id: "market-entry", icon: Compass, title: "Market entry programmes",
    lead: "For companies making a serious move into the region.",
    body: "A full programme for foreign companies and investors: structure, setup, partners, banking, hiring and introductions, planned around your timeline and run by a dedicated team.",
    points: ["Entry strategy and structure", "End-to-end setup and compliance", "Introductions to partners and institutions", "Hiring and local banking", "A dedicated team and regular reporting"],
  },
];

export default function Services() {
  return (
    <>
      <PageHero eyebrow="Services" title={<>Everything you need to start and grow<span className="text-mint">.</span></>}
        sub="Five services, one partner. Start with the one you need today and add the rest as you grow.">
        <CtaLink href="/contact" variant="mint">Tell us what you need</CtaLink>
        <CtaLink href="/pricing" variant="outline-light">See pricing</CtaLink>
      </PageHero>

      {/* Jump links */}
      <div className="sticky top-16 z-30 border-b border-line bg-white/90 backdrop-blur-md sm:top-[72px]">
        <nav aria-label="Services" className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 py-3">
          {services.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="shrink-0 rounded-full px-4 py-2 text-sm text-ink/70 hover:bg-sunken hover:text-ink">{s.title}</a>
          ))}
        </nav>
      </div>

      {services.map((s, i) => (
        <Section key={s.id} id={s.id} tone={i % 2 ? "white" : "canvas"} className="grid scroll-mt-32 gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="grid size-14 place-items-center rounded-2xl bg-navy-900 text-mint"><s.icon className="size-7" /></span>
            <p className="num mt-8 text-sm font-semibold text-green">0{i + 1}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{s.title}</h2>
            <p className="mt-4 text-xl text-ink/80 text-pretty">{s.lead}</p>
            <p className="mt-4 text-muted text-pretty">{s.body}</p>
            <div className="mt-8">
              <CtaLink href={s.href ?? "/contact"} variant={s.href ? "primary" : "ghost"}>{s.href ? "How verification works" : "Ask about this"}</CtaLink>
            </div>
          </div>
          <ul className={`self-start rounded-[2rem] p-8 ${i % 2 ? "bg-canvas" : "bg-white"}`}>
            <p className="label mb-5">What&apos;s included</p>
            {s.points.map((p) => (
              <li key={p} className="flex items-start gap-3 border-t border-line py-4 first-of-type:border-t-0">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint-100 text-green"><Check className="size-3" strokeWidth={3} /></span>
                {p}
              </li>
            ))}
          </ul>
        </Section>
      ))}

      <CtaBand />
    </>
  );
}
