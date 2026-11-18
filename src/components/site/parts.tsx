import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/format";
import { Arcs } from "./arcs";
import { NAV } from "./nav";

export function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium tracking-wide", light ? "bg-white/10 text-mint" : "bg-mint-100 text-green")}>
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Navy page hero used on every inner page. The header sits on top of it. */
export function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: ReactNode; sub: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative -mt-16 overflow-hidden bg-navy-900 pt-16 text-white sm:-mt-[72px] sm:pt-[72px]">
      <Arcs className="pointer-events-none absolute -right-56 -top-40 w-[900px] text-white/[0.06]" />
      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <Eyebrow light>{eyebrow}</Eyebrow>
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg text-white/75 text-pretty">{sub}</p>
        {children ? <div className="mt-9 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

export function Section({ children, className, id, tone = "canvas" }: { children: ReactNode; className?: string; id?: string; tone?: "canvas" | "white" | "navy" }) {
  return (
    <section id={id} className={cn(tone === "white" && "bg-white", tone === "navy" && "bg-navy-900 text-white")}>
      <div className={cn("mx-auto max-w-6xl px-6 py-20 sm:py-28", className)}>{children}</div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, sub, center, light }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; center?: boolean; light?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow ? <Eyebrow light={light}>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-[2.6rem]">{title}</h2>
      {sub ? <p className={cn("mt-4 text-lg text-pretty", light ? "text-white/70" : "text-muted")}>{sub}</p> : null}
    </div>
  );
}

export function CtaLink({ href, children, variant = "primary", className }: { href: string; children: ReactNode; variant?: "primary" | "mint" | "ghost" | "outline-light"; className?: string }) {
  const styles = {
    primary: "bg-navy-900 text-white hover:bg-navy-700",
    mint: "bg-mint text-navy-950 hover:bg-white",
    ghost: "text-navy-900 hover:bg-navy-50",
    "outline-light": "border border-white/25 text-white hover:border-white hover:bg-white/5",
  }[variant];
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition", styles, className)}>
      {children}
      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export function CtaBand() {
  return (
    <section className="px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-navy-900 px-8 py-16 text-white sm:px-16 sm:py-20">
        <Arcs className="pointer-events-none absolute -bottom-72 -right-40 w-[760px] text-white/[0.07]" />
        <div className="relative grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">Your way in<span className="text-mint">.</span></p>
            <p className="mt-4 max-w-lg text-lg text-white/70">Create a free account in two minutes, or tell us what you&apos;re planning and we&apos;ll get back to you personally.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <CtaLink href="/signup" variant="mint">Create a free account</CtaLink>
            <CtaLink href="/contact" variant="outline-light">Talk to us</CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-canvas">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">Set up and grow in Kenya and East Africa. Company setup, verification, vetted partner firms and curated opportunities.</p>
        </div>
        <div>
          <p className="label mb-3">Company</p>
          <ul className="space-y-2 text-sm">{NAV.map((n) => <li key={n.href}><Link href={n.href} className="text-ink/75 hover:text-ink">{n.label}</Link></li>)}</ul>
        </div>
        <div>
          <p className="label mb-3">Account</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/signup" className="text-ink/75 hover:text-ink">Create an account</Link></li>
            <li><Link href="/login" className="text-ink/75 hover:text-ink">Sign in</Link></li>
            <li><Link href="/forgot-password" className="text-ink/75 hover:text-ink">Reset password</Link></li>
          </ul>
        </div>
        <div>
          <p className="label mb-3">Get in touch</p>
          <ul className="space-y-2 text-sm text-ink/75">
            <li><a href="mailto:hello@dhowpartners.com" className="hover:text-ink">hello@dhowpartners.com</a></li>
            <li>Nairobi, Kenya</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-muted">
          <p>© {new Date().getFullYear()} Dhow Partners. All rights reserved.</p>
          <div className="flex gap-5"><Link href="/privacy" className="hover:text-ink">Privacy</Link><Link href="/terms" className="hover:text-ink">Terms</Link></div>
        </div>
      </div>
    </footer>
  );
}
