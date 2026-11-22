"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { TIERS, TIER_ORDER, type Period, type Tier } from "@/lib/plans";
import { applyForEnterprise } from "@/actions/help";
import { cn, kes } from "@/lib/format";

export function PlanPicker({ current, canPay, until, off, cancelled }: { current: Tier; canPay: boolean; until: string | null; off: Record<string, { events: number; services: number }>; cancelled: boolean }) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [busy, setBusy] = useState<Tier | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});

  async function pay(tier: Tier) {
    setBusy(tier);
    setMsg({});
    try {
      const r = await fetch("/api/payments/membership", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier, period }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      window.location.href = j.url;
    } catch (e) {
      setMsg({ error: (e as Error).message || "Couldn't start the payment." });
      setBusy(null);
    }
  }

  async function applyEnterprise() {
    setBusy("enterprise");
    setMsg({});
    const r = await applyForEnterprise();
    setBusy(null);
    setMsg(r.ok ? { ok: "Thanks. We'll call you within one working day to scope your setup and quote." } : { error: r.error });
  }

  const rank = TIER_ORDER.indexOf(current);
  const ends = until ? new Date(`${until}T12:00:00+03:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
  return (
    <div>
      <div className="mb-6 flex justify-center">
        <div role="radiogroup" aria-label="Billing" className="inline-flex rounded-full bg-white p-1 ring-1 ring-line">
          {(["monthly", "yearly"] as Period[]).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
              className={cn("rounded-full px-5 py-2 text-sm transition", period === p ? "bg-navy-900 font-medium text-white" : "text-ink/70 hover:text-ink")}>
              {p === "monthly" ? "Monthly" : "Yearly"}
              {p === "yearly" ? <span className={cn("ml-1.5 text-xs", period === p ? "text-mint-100" : "text-green")}>2 months free</span> : null}
            </button>
          ))}
        </div>
      </div>
      {msg.error ? <p className="mx-auto mb-4 max-w-xl rounded-2xl bg-bad/10 px-4 py-3 text-center text-sm text-bad">{msg.error}</p> : null}
      {msg.ok ? <p className="mx-auto mb-4 max-w-xl rounded-2xl bg-good/10 px-4 py-3 text-center text-sm text-good">{msg.ok}</p> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TIER_ORDER.map((t, i) => {
          const tier = TIERS[t];
          const price = period === "yearly" ? tier.yearly : tier.monthly;
          const isCurrent = t === current;
          const featured = t === "premium";
          const btn = "w-full rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60";
          let action: React.ReactNode = null;
          if (t === "free") action = <p className="py-2.5 text-center text-sm text-muted">{isCurrent ? "You're on this plan" : "Always available"}</p>;
          else if (!canPay) action = <p className="py-2.5 text-center text-sm text-muted">{isCurrent ? "Your current plan" : "Ask a company admin to change the plan."}</p>;
          else if (t === "enterprise") action = isCurrent
            ? <p className="py-2.5 text-center text-sm text-muted">Your current plan</p>
            : <button type="button" onClick={applyEnterprise} disabled={!!busy} className={cn(btn, "border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white")}>{busy === t ? "Sending…" : "Apply for Enterprise"}</button>;
          else if (isCurrent) action = <button type="button" onClick={() => pay(t)} disabled={!!busy} className={cn(btn, "border border-line hover:bg-sunken")}>{busy === t ? "Opening checkout…" : `Renew${ends ? ` · ends ${ends}` : ""}`}</button>;
          else action = (
            <button type="button" onClick={() => pay(t)} disabled={!!busy}
              className={cn(btn, featured ? "bg-navy-900 text-white hover:bg-navy-800" : "border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white")}>
              {busy === t ? "Opening checkout…" : i > rank ? `Choose ${tier.name}` : `Switch to ${tier.name}`}
            </button>
          );
          return (
            <div key={t} className={cn("relative flex flex-col rounded-[1.75rem] bg-white p-6 ring-1 transition", isCurrent ? "ring-2 ring-navy-900" : featured ? "ring-navy-200" : "ring-line")}>
              {isCurrent ? <span className="absolute -top-3 left-6 rounded-full bg-navy-900 px-3 py-1 text-xs font-medium text-white">Current plan</span>
                : featured ? <span className="absolute -top-3 left-6 rounded-full bg-green px-3 py-1 text-xs font-medium text-white">Most popular</span> : null}
              <p className="text-lg font-semibold">{tier.name}{tier.site ? <span className="ml-1.5 text-sm font-normal text-muted">· {tier.site}</span> : null}</p>
              <p className="mt-1 min-h-10 text-sm text-muted">{tier.tagline}</p>
              <p className="mt-5">
                {price ? (
                  <>
                    <span className="num text-3xl font-semibold tracking-tight">{kes(price)}</span>
                    <span className="text-sm text-muted"> / {period === "yearly" ? "year" : "month"}</span>
                  </>
                ) : price === 0 ? <span className="text-3xl font-semibold tracking-tight">Free</span>
                  : <span className="text-2xl font-semibold tracking-tight">Custom quote</span>}
              </p>
              {off[t] && (off[t].events || off[t].services) ? (
                <p className="mt-4 rounded-xl bg-mint-100/70 px-3 py-2 text-xs text-green">
                  {[off[t].events ? `${off[t].events}% off event representation` : null, off[t].services ? `${off[t].services}% off Dhow services` : null].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {tier.perks.map((p) => (
                  <li key={p} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-green" strokeWidth={2.25} />{p}</li>
                ))}
              </ul>
              <div className="mt-6">{action}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
