import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Building2, Check, FileLock2, Globe2, Handshake, Megaphone, Rocket, ShieldCheck } from "lucide-react";
import { Arcs } from "@/components/site/arcs";
import { CtaBand, CtaLink, Eyebrow, Section, SectionHead } from "@/components/site/parts";
import { kes } from "@/lib/format";

export const metadata: Metadata = {
  title: { absolute: "Dhow Partners · Your way in to Kenya and East Africa" },
  description: "Set up and grow in Kenya and East Africa. Company registration, the Dhow Verified badge, vetted partner firms and curated opportunities, with one named contact.",
};

const fee = Number(process.env.VERIFICATION_FEE_KES ?? 500);

const services = [
  { icon: Building2, title: "Company setup", body: "Business registration, KRA PIN and permits, handled by our team with one named contact from first call to certificate.", href: "/services#setup" },
  { icon: BadgeCheck, title: "Dhow Verified", body: "A badge that shows partners and buyers your company is registered and real. Free review, or instant with M-Pesa.", href: "/verified" },
  { icon: Handshake, title: "Vetted partner firms", body: "Lawyers, accountants, banks and recruiters we have checked before they ever see your work.", href: "/services#partners" },
  { icon: Megaphone, title: "Opportunities", body: "Curated RFPs, tenders, grants and events, matched to your sector and open to verified companies.", href: "/services#opportunities" },
];

const steps = [
  { n: "01", title: "Create your company", body: "Sign up free, add your company details and invite your team. It takes about two minutes." },
  { n: "02", title: "Get verified", body: `Upload your registration documents for a free review, or pay ${kes(fee)} by M-Pesa for an instant check.` },
  { n: "03", title: "Grow", body: "Apply to opportunities, work with vetted partner firms, and let us handle the paperwork as you expand." },
];

const audiences = [
  { icon: Globe2, title: "Foreign investors and companies", body: "Enter Kenya with the right structure from day one, and a local team that answers your questions plainly." },
  { icon: Rocket, title: "Founders and SMEs", body: "Get registered, get compliant and get in front of buyers, grant makers and partners who need proof you're real." },
  { icon: ShieldCheck, title: "Partners and institutions", body: "Find companies that have already been checked, and reach them through a single, trusted point of contact." },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative -mt-16 overflow-hidden bg-navy-900 pt-16 text-white sm:-mt-[72px] sm:pt-[72px]">
        <Arcs className="pointer-events-none absolute -left-[28rem] top-1/2 w-[1100px] -translate-y-1/2 text-white/[0.07]" rings={7} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pt-16 pb-24 sm:pt-24 lg:grid-cols-[1.25fr_1fr] lg:pb-32">
          <div>
            <Eyebrow light>Kenya · East Africa</Eyebrow>
            <h1 className="mt-7 text-5xl leading-[1] font-semibold tracking-tight sm:text-7xl lg:text-[5.5rem]">
              Your way in<span className="text-mint">.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-white/75 sm:text-xl text-pretty">
              Set up and grow in Kenya and East Africa. Company registration, verification, trusted partner firms and the opportunities that matter, with one partner from first call to first contract.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <CtaLink href="/signup" variant="mint">Create a free account</CtaLink>
              <CtaLink href="/contact" variant="outline-light">Talk to us</CtaLink>
            </div>
            <p className="mt-6 text-sm text-white/50">Free to join · No card needed · Verification from {kes(fee)}</p>
          </div>

          {/* Example badge card */}
          <div className="relative mx-auto w-full max-w-sm lg:ml-auto">
            <div className="absolute -inset-6 -z-0 rounded-[3rem] bg-mint/10 blur-2xl" aria-hidden />
            <div className="relative rounded-[2rem] bg-white p-6 text-ink shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <p className="label">Company profile</p>
                <span className="rounded-full bg-sunken px-2.5 py-1 text-[11px] text-muted">Example</span>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-lg font-semibold text-white">A</div>
                <div>
                  <p className="font-semibold">Acacia Solar Ltd</p>
                  <p className="text-sm text-muted">Energy · Nairobi</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-mint-100 px-4 py-3">
                <BadgeCheck className="size-6 text-green" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">Dhow Verified</p>
                  <p className="text-xs text-muted">Valid for 12 months</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {["Registration matches official records", "KRA PIN on file", "Documents reviewed by Dhow"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5"><span className="grid size-5 place-items-center rounded-full bg-green text-white"><Check className="size-3" strokeWidth={3} /></span>{t}</li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between text-sm"><span className="font-medium">New opportunity</span><span className="text-xs text-muted">Closes in 12 days</span></div>
                <p className="mt-1 text-sm text-muted">Solar mini-grid installation RFP</p>
                <p className="mt-3 inline-flex rounded-full bg-navy-900 px-3 py-1 text-xs text-white">Open to verified companies</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What we handle */}
      <div className="border-b border-line bg-white">
        <div className="no-scrollbar mx-auto flex max-w-6xl items-center gap-8 overflow-x-auto px-6 py-6 text-sm whitespace-nowrap text-muted">
          <span className="font-medium text-ink">What we handle</span>
          {["Business registration", "KRA PIN", "Business permits", "Document vault", "Verification", "Partner introductions", "RFPs and grants", "Market entry plans"].map((t) => (
            <span key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-mint" />{t}</span>
          ))}
        </div>
      </div>

      {/* Intro + numbers */}
      <Section className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <Eyebrow>Why Dhow</Eyebrow>
        <div>
          <p className="text-2xl leading-snug font-medium tracking-tight sm:text-[2rem] text-balance">
            We help founders, investors and foreign companies do business in Kenya with confidence: <span className="text-navy-500">properly registered, verified, and connected to the right people.</span>
          </p>
          <dl className="mt-12 grid gap-8 sm:grid-cols-3">
            {[["48 h", "to a written plan for your setup"], ["1", "named contact for every client"], ["4", "checks before a partner firm gets work"]].map(([n, t]) => (
              <div key={t} className="border-t-2 border-navy-900 pt-4">
                <dt className="num text-4xl font-semibold tracking-tight text-navy-900">{n}</dt>
                <dd className="mt-2 text-sm text-muted">{t}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* Services */}
      <Section tone="white">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow="Services" title="Everything you need to start and grow" sub="Four things, done properly, by people who know how Kenya actually works." />
          <CtaLink href="/services" variant="ghost">All services</CtaLink>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {services.map((s, i) => (
            <Link key={s.title} href={s.href}
              className={`group relative flex flex-col justify-between rounded-[2rem] p-8 transition hover:-translate-y-1 ${i === 1 ? "bg-navy-900 text-white" : "bg-canvas hover:bg-navy-50"}`}>
              <div className="flex items-start justify-between">
                <span className={`grid size-12 place-items-center rounded-2xl ${i === 1 ? "bg-mint text-navy-950" : "bg-white text-navy-900"}`}><s.icon className="size-6" /></span>
                <ArrowUpRight className={`size-6 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${i === 1 ? "text-mint" : "text-navy-500"}`} />
              </div>
              <div className="mt-16">
                <p className="text-2xl font-semibold tracking-tight">{s.title}</p>
                <p className={`mt-2 ${i === 1 ? "text-white/70" : "text-muted"}`}>{s.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section>
        <SectionHead eyebrow="How it works" title="Three steps from sign-up to growth" center />
        <ol className="mt-14 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="card relative overflow-hidden p-8">
              <p className="num text-sm font-semibold text-green">{s.n}</p>
              <p className="mt-10 text-xl font-semibold tracking-tight">{s.title}</p>
              <p className="mt-2 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Verified spotlight */}
      <Section tone="navy" className="relative grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHead light eyebrow="Dhow Verified" title={<>Proof your company is real, <span className="text-mint">in minutes</span></>}
            sub="Buyers, grant makers and partners want to know who they're dealing with. The Dhow Verified badge shows your registration has been checked against official records." />
          <div className="mt-9 flex flex-wrap gap-3">
            <CtaLink href="/verified" variant="mint">How verification works</CtaLink>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] bg-white/[0.06] p-7 ring-1 ring-white/10">
            <FileLock2 className="size-6 text-mint" />
            <p className="mt-8 text-lg font-semibold">Free review</p>
            <p className="mt-2 text-sm text-white/65">Upload your certificate or CR12 and KRA PIN. Our team reviews them and emails you the result.</p>
          </div>
          <div className="rounded-[2rem] bg-mint p-7 text-navy-950">
            <BadgeCheck className="size-6" />
            <p className="mt-8 text-lg font-semibold">Instant · {kes(fee)}</p>
            <p className="mt-2 text-sm text-navy-950/75">Pay by M-Pesa on your phone. We check your registration automatically and badge you straight away when it matches.</p>
          </div>
        </div>
      </Section>

      {/* Who it's for */}
      <Section tone="white">
        <SectionHead eyebrow="Who it's for" title="Built for people doing serious business in the region" />
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title}>
              <span className="grid size-12 place-items-center rounded-2xl bg-mint-100 text-green"><a.icon className="size-6" /></span>
              <p className="mt-6 text-xl font-semibold tracking-tight">{a.title}</p>
              <p className="mt-2 text-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing teaser */}
      <Section className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
        <SectionHead eyebrow="Pricing" title="Free to join. Pay only for what you use." sub="Start free and upgrade when you need more storage, more support, or a full market-entry programme." />
        <div className="card flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label">Plans from</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">Free</p>
            <p className="mt-1 text-sm text-muted">Starter {kes(1000)} · Growth {kes(5000)} per month</p>
          </div>
          <CtaLink href="/pricing">Compare plans</CtaLink>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
