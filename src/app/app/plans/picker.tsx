"use client";
import { useState } from "react";
import { BellRing, Check, ChevronDown, Minus, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import { COMPARE, HIGHLIGHTS, TIERS, TIER_ORDER, type Period, type Tier } from "@/lib/plans";
import { applyForEnterprise } from "@/actions/help";
import { cn, kes } from "@/lib/format";

export function PlanPicker({ open = true, current, canPay, until, off }: { open?: boolean; current: Tier; canPay: boolean; until: string | null; off: Record<string, { events: number; services: number }>; cancelled?: boolean }) {
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
  const btn = "flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60";
  return (
    <div>
      {/* 4. Yearly savings shown on the switch itself */}
      <div className="mb-8 flex justify-center">
        <div role="radiogroup" aria-label="Billing" className="inline-flex items-center rounded-full bg-white p-1 ring-1 ring-line">
          {(["monthly", "yearly"] as Period[]).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
              className={cn("flex items-center gap-2 rounded-full px-5 py-2 text-sm transition", period === p ? "bg-navy-900 font-medium text-white" : "text-ink/70 hover:text-ink")}>
              {p === "monthly" ? "Monthly" : "Yearly"}
              {p === "yearly" ? <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", period === p ? "bg-mint text-navy-950" : "bg-mint-100 text-green")}>2 months free</span> : null}
            </button>
          ))}
        </div>
      </div>
      {msg.error ? <p className="mx-auto mb-4 max-w-xl rounded-2xl bg-bad/10 px-4 py-3 text-center text-sm text-bad">{msg.error}</p> : null}
      {msg.ok ? <p className="mx-auto mb-4 max-w-xl rounded-2xl bg-good/10 px-4 py-3 text-center text-sm text-good">{msg.ok}</p> : null}

      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TIER_ORDER.map((t, i) => {
          const tier = TIERS[t];
          const h = HIGHLIGHTS[t];
          const featured = t === "premium";
          const isCurrent = t === current;
          const monthly = tier.monthly ?? 0;
          const perMonth = period === "yearly" && tier.yearly ? Math.round(tier.yearly / 12) : monthly;
          const saving = period === "yearly" && tier.yearly && tier.monthly ? tier.monthly * 12 - tier.yearly : 0;

          // 5. Buttons that say exactly what happens
          let action: React.ReactNode;
          if (isCurrent && t !== "free" && t !== "enterprise" && canPay && open) {
            action = <button type="button" onClick={() => pay(t)} disabled={!!busy} className={cn(btn, "border border-line bg-white hover:bg-sunken")}>{busy === t ? "Opening checkout…" : `Renew ${tier.name}${ends ? ` · ends ${ends}` : ""}`}</button>;
          } else if (isCurrent) {
            action = <p className={cn(btn, "bg-sunken font-medium text-ink/60")}>Your current plan</p>;
          } else if (t === "free") {
            action = <p className={cn(btn, "font-medium text-ink/50")}>Always free</p>;
          } else if (t === "enterprise") {
            action = canPay
              ? <button type="button" onClick={applyEnterprise} disabled={!!busy} className={cn(btn, "border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white")}>{busy === t ? "Sending…" : "Talk to us →"}</button>
              : <p className={cn(btn, "font-medium text-ink/50")}>Ask your company admin</p>;
          } else if (!open) {
            action = <a href="https://dhowpartners.com/apply" target="_blank" rel="noopener noreferrer" className={cn(btn, featured ? "bg-navy-900 text-white hover:bg-navy-800" : "border border-line bg-white text-ink/80 hover:bg-sunken")}>Starting soon · Apply →</a>;
          } else if (!canPay) {
            action = <p className={cn(btn, "font-medium text-ink/50")}>Ask your company admin</p>;
          } else {
            action = (
              <button type="button" onClick={() => pay(t)} disabled={!!busy} className={cn(btn, featured ? "bg-navy-900 text-white shadow-lg shadow-navy-900/20 hover:bg-navy-800" : "border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white")}>
                {busy === t ? "Opening checkout…" : `${i > rank ? h.cta : `Switch to ${tier.name}`} · ${kes(period === "yearly" ? tier.yearly! : monthly)}${period === "yearly" ? "/yr" : "/mo"} →`}
              </button>
            );
          }

          return (
            <div key={t} className={cn("relative flex flex-col rounded-[1.75rem] bg-white transition",
              featured ? "ring-2 ring-navy-900 shadow-[0_30px_60px_-30px_rgba(13,28,41,0.45)] xl:-my-3" : isCurrent ? "ring-2 ring-green/60" : "ring-1 ring-line")}>
              {/* 3. The plan most companies should pick stands out */}
              {featured ? <div className="rounded-t-[1.6rem] bg-navy-900 py-1.5 text-center text-[11px] font-semibold tracking-[0.14em] text-white uppercase">Most popular</div> : null}
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold">{tier.name}</p>
                  {isCurrent ? <span className="rounded-full bg-mint-100 px-2.5 py-0.5 text-[11px] font-semibold text-green">Current</span>
                    : saving ? <span className="rounded-full bg-mint-100 px-2.5 py-0.5 text-[11px] font-semibold text-green">Save {kes(saving)} a year</span> : null}
                </div>
                <p className="mt-1 min-h-10 text-sm text-muted">{tier.tagline}</p>

                {/* 2. Big, easy-to-read price */}
                <div className="mt-5 min-h-[5.5rem]">
                  {tier.monthly === null ? (
                    <><p className="text-4xl font-semibold tracking-tight">Custom</p><p className="mt-1 text-sm text-muted">Quoted for your setup</p></>
                  ) : monthly === 0 ? (
                    <><p className="text-4xl font-semibold tracking-tight">Free</p><p className="mt-1 text-sm text-muted">Forever</p></>
                  ) : (
                    <>
                      <p className="flex items-baseline gap-2">
                        {period === "yearly" ? <span className="num text-lg text-faint line-through">{kes(monthly)}</span> : null}
                        <span className="num text-4xl font-semibold tracking-tight">{kes(perMonth)}</span>
                        <span className="text-sm text-muted">/month</span>
                      </p>
                      <p className="mt-1 text-sm text-muted">{period === "yearly" ? `Billed ${kes(tier.yearly!)} once a year` : "Billed monthly"}</p>
                    </>
                  )}
                </div>

                <div className="mt-5">{action}</div>

                {/* 1. Only what makes this plan different; the rest is in the table below */}
                <div className="mt-6 border-t border-line pt-5">
                  {h.lead ? <p className="mb-3 text-xs font-semibold text-ink/60">{h.lead}</p> : <p className="mb-3 text-xs font-semibold text-ink/60">Includes:</p>}
                  <ul className="space-y-2.5 text-sm">
                    {h.items.map((p) => <li key={p} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-green" strokeWidth={2.25} />{p}</li>)}
                  </ul>
                  {off[t] && (off[t].events || off[t].services) ? (
                    <p className="mt-4 text-xs text-green">{[off[t].events ? `${off[t].events}% off event representation` : null, off[t].services ? `${off[t].services}% off Dhow services` : null].filter(Boolean).join(" · ")}</p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. Reassurance */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
        <span className="flex items-center gap-1.5"><RotateCcw className="size-4" />Cancel anytime</span>
        <span className="flex items-center gap-1.5"><Smartphone className="size-4" />Pay by M-Pesa or card</span>
        <span className="flex items-center gap-1.5"><BellRing className="size-4" />No auto-renewal: we remind you first</span>
        <span className="flex items-center gap-1.5"><ShieldCheck className="size-4" />Free plan needs no payment</span>
      </div>

      {/* 1. Every feature, side by side */}
      <details className="group mt-10 rounded-[1.75rem] bg-white ring-1 ring-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5">
          <span><span className="block text-lg font-semibold">Compare every feature</span><span className="text-sm text-muted">All four plans, side by side</span></span>
          <ChevronDown className="size-5 text-ink/50 transition group-open:rotate-180" />
        </summary>
        <div className="overflow-x-auto px-2 pb-4 sm:px-6">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-3 pr-4 font-medium text-muted">Feature</th>
                {TIER_ORDER.map((t) => <th key={t} className={cn("px-3 py-3 text-center font-semibold", t === "premium" && "text-navy-900")}>{TIERS[t].name}</th>)}
              </tr>
            </thead>
            {COMPARE.map((g) => (
              <tbody key={g.group}>
                <tr><td colSpan={5} className="pt-5 pb-2 text-xs font-semibold tracking-wide text-ink/50 uppercase">{g.group}</td></tr>
                {g.rows.map((r) => (
                  <tr key={r.label} className="border-t border-line">
                    <td className="py-3 pr-4">{r.label}</td>
                    {TIER_ORDER.map((t) => {
                      const v = r.v[t];
                      return (
                        <td key={t} className={cn("px-3 py-3 text-center", t === "premium" && "bg-navy-50/40")}>
                          {v === true ? <Check className="mx-auto size-4 text-green" strokeWidth={2.5} aria-label="Included" />
                            : v === false ? <Minus className="mx-auto size-4 text-ink/25" aria-label="Not included" />
                            : <span className="text-ink/80">{v}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </details>
    </div>
  );
}
