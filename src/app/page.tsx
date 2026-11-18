import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Building2, FileLock2, Handshake } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { PLAN_LABEL, PLAN_PRICE_KES } from "@/lib/types";
import { kes } from "@/lib/format";

const services = [
  { title: "Company setup", body: "BRS registration, KRA PIN and business permits, done by our own team.", icon: Building2 },
  { title: "Dhow Verified", body: "A trust badge partners and buyers can check, issued in minutes after an M-Pesa payment.", icon: BadgeCheck },
  { title: "Vetted partner firms", body: "Lawyers, accountants, banks and recruiters we've checked, coordinated by one named contact.", icon: Handshake },
  { title: "Opportunities", body: "Curated RFPs, grants and events from KenInvest, KNCCI and embassies, matched to your sector.", icon: FileLock2 },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-forest-900 text-white">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(60%_50%_at_70%_20%,#2f7a57,transparent),radial-gradient(40%_40%_at_10%_80%,#154b34,transparent)]" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo light />
          <nav className="hidden items-center gap-8 text-sm text-white/80 md:flex">
            <a href="#services" className="hover:text-white">Services</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link href="/login" className="hover:text-white">Sign in</Link>
          </nav>
          <ButtonLink href="/signup" variant="outline" className="border-white/30 bg-transparent text-white hover:border-white">Get started</ButtonLink>
        </header>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 pt-16 pb-10 md:grid-cols-[1.4fr_1fr] md:pt-24">
          <h1 className="text-4xl leading-[1.08] font-medium tracking-tight sm:text-6xl">
            Set up, get verified<br />and grow in Kenya.
          </h1>
          <div className="self-end">
            <p className="text-white/75">One partner for company registration, trusted local firms, and the opportunities that matter to your business, from first call to first contract.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/signup" variant="accent">Create a free account</ButtonLink>
              <ButtonLink href="#services" variant="outline" className="border-white/30 bg-transparent text-white hover:border-white">How it works</ButtonLink>
            </div>
          </div>
        </div>
        <p aria-hidden className="relative mx-auto max-w-6xl px-4 pb-2 text-[22vw] leading-none font-semibold tracking-tighter text-white/10 select-none md:text-[15rem]">DHOW</p>
      </section>

      {/* Intro */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1fr_1.4fr]">
        <span className="h-fit w-fit rounded-full border border-ink/20 px-3 py-1 text-xs tracking-wider uppercase">Introduction</span>
        <div>
          <p className="text-2xl leading-snug sm:text-3xl">
            We help founders, investors and foreign companies do business in Kenya with confidence: properly registered, verified, and connected to the right people.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-line pt-6">
            {[["48 h", "to a written plan"], ["1", "named contact per client"], ["4", "checks before a partner firm gets work"]].map(([n, t]) => (
              <div key={t} className="border-l-2 border-lime pl-4">
                <p className="text-3xl font-medium">{n}</p>
                <p className="mt-1 text-xs text-muted">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <span className="rounded-full border border-ink/20 px-3 py-1 text-xs tracking-wider uppercase">Services</span>
            <h2 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">Everything you need to start and grow</h2>
          </div>
          <ul className="mt-12 divide-y divide-line border-y border-line">
            {services.map((s, i) => (
              <li key={s.title} className={i === 1 ? "my-2 rounded-2xl bg-lime" : ""}>
                <div className="flex items-center gap-6 px-4 py-6 sm:px-6">
                  <s.icon className="size-6 shrink-0 text-forest-600" />
                  <div className="flex-1">
                    <p className="text-xl">{s.title}</p>
                    <p className="mt-1 text-sm text-ink/70">{s.body}</p>
                  </div>
                  <ArrowUpRight className="size-6 shrink-0" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Simple pricing</h2>
        <p className="mt-2 text-muted">Free to join. Verification is a one-off {kes(Number(process.env.VERIFICATION_FEE_KES ?? 500))} by M-Pesa.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {(["free", "starter", "growth", "market_entry"] as const).map((p) => (
            <div key={p} className={p === "growth" ? "card bg-forest-900 text-white" : "card"}>
              <p className={p === "growth" ? "text-sm text-white/70" : "label"}>{PLAN_LABEL[p]}</p>
              <p className="mt-6 text-3xl font-semibold">{PLAN_PRICE_KES[p] === null ? "Custom" : PLAN_PRICE_KES[p] === 0 ? "Free" : kes(PLAN_PRICE_KES[p])}</p>
              <p className={p === "growth" ? "text-sm text-white/70" : "text-sm text-muted"}>{PLAN_PRICE_KES[p] ? "per month" : " "}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted">
          <Logo />
          <p>© {new Date().getFullYear()} Dhow Partners · Nairobi, Kenya</p>
          <div className="flex gap-6">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
