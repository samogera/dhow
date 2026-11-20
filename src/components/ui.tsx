import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/format";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-navy-900 text-white hover:bg-navy-700",
  accent: "bg-mint text-ink hover:bg-mint-600",
  outline: "border border-line bg-white text-ink hover:border-ink/30",
  ghost: "text-ink hover:bg-sunken",
  danger: "bg-bad/10 text-bad hover:bg-bad/15",
};
const base = "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none";

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...p} />;
}

export function ButtonLink({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...p} />;
}

/** A button-styled plain link for files and API routes, which must not be prefetched as pages. */
export function ButtonAnchor({ variant = "primary", className, ...p }: ComponentProps<"a"> & { variant?: Variant }) {
  return <a className={cn(base, variants[variant], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("card", className)} {...p} />;
}

export function CardHeader({ title, sub, href, action }: { title: string; sub?: string; href?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {sub ? <p className="mt-0.5 text-sm text-muted">{sub}</p> : null}
      </div>
      {action}
      {href ? (
        <Link href={href} aria-label={`Open ${title}`} className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-ink/30 hover:text-ink">
          <ArrowUpRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeader({ title, accent, sub, children }: { title: string; accent?: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-tight">
          {title}
          {accent ? <span className="text-faint"> {accent}</span> : null}
        </h1>
        {sub ? <p className="mt-2 text-muted">{sub}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

type Tone = "good" | "warn" | "bad" | "neutral" | "info" | "mint";
const tones: Record<Tone, string> = {
  good: "bg-good/10 text-good",
  warn: "bg-warn/10 text-warn",
  bad: "bg-bad/10 text-bad",
  neutral: "bg-sunken text-muted",
  info: "bg-navy-50 text-navy-600",
  mint: "bg-mint text-ink",
};
export function Badge({ tone = "neutral", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", tones[tone])}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  verified: "good", paid: "good", approved: "good", won: "good", done: "good", active: "good", completed: "good", uploaded: "info", submitted: "info",
  pending: "warn", in_review: "warn", awaiting_payment: "warn", part_paid: "warn", sent: "info", shortlisted: "info", in_progress: "info", review: "warn", vetting: "warn", onboarding: "info", plan_sent: "info", call_booked: "info", contacted: "info",
  rejected: "bad", failed: "bad", overdue: "bad", lost: "bad", cancelled: "neutral", expired: "bad", unpaid: "warn",
};
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "neutral"} dot>{status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}</Badge>;
}

export function Stat({ label, value, note, highlight }: { label: string; value: ReactNode; note?: ReactNode; highlight?: boolean }) {
  return (
    <div className={cn("card flex flex-col justify-between gap-6", highlight && "bg-amber-100")}>
      <p className={cn("label", highlight && "text-amber-700")}>{label}</p>
      <div>
        <p className="num text-3xl font-semibold tracking-tight">{value}</p>
        {note ? <p className={cn("mt-1 text-sm", highlight ? "text-ink/70" : "text-muted")}>{note}</p> : null}
      </div>
    </div>
  );
}

export function Empty({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-line px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {sub ? <p className="mt-1 max-w-sm text-sm text-muted">{sub}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input(p: ComponentProps<"input">) {
  return <input {...p} className={cn("field", p.className)} />;
}
export function Textarea(p: ComponentProps<"textarea">) {
  return <textarea {...p} className={cn("field min-h-28", p.className)} />;
}
export function Select(p: ComponentProps<"select">) {
  return <select {...p} className={cn("field appearance-none", p.className)} />;
}

export function Table({ head, children, className }: { head: string[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-2 overflow-x-auto", className)}>
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="text-xs text-muted">
            {head.map((h) => (
              <th key={h} className="px-2 pb-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:px-2 [&_td]:py-3.5">{children}</tbody>
      </table>
    </div>
  );
}

export function Meter({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-sunken" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cn("h-full rounded-full", pct > 90 ? "bg-bad" : "bg-navy-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Tabs({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return (
    <nav className="mb-6 inline-flex flex-wrap gap-1 rounded-full bg-white p-1">
      {items.map((t) => (
        <Link key={t.href} href={t.href} className={cn("rounded-full px-4 py-2 text-sm transition", t.href === current ? "bg-navy-900 text-white" : "text-muted hover:text-ink")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
