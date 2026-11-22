"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn, kes } from "@/lib/format";

type Line = { label: string; amount: string };
const chip = (on: boolean) => cn("rounded-full px-3 py-1.5 text-xs font-medium transition", on ? "bg-navy-900 text-white" : "bg-sunken text-ink/70 hover:text-ink");

/** Works out a percentage share of one or many amounts: what a partner owes us, or what we owe them. */
export function ShareCalculator({ presets }: { presets: { label: string; amount: number }[] }) {
  const [lines, setLines] = useState<Line[]>([{ label: "", amount: "" }]);
  const [pct, setPct] = useState("10");
  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatRate, setVatRate] = useState("16");
  const [direction, setDirection] = useState<"owe_us" | "we_owe">("owe_us");

  const r = useMemo(() => {
    const gross = lines.reduce((n, l) => n + (Number(l.amount) || 0), 0);
    const base = vatIncluded ? gross / (1 + (Number(vatRate) || 0) / 100) : gross;
    const share = (base * (Number(pct) || 0)) / 100;
    return { gross, base, vat: gross - base, share, rest: base - share };
  }, [lines, pct, vatIncluded, vatRate]);

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="card space-y-6">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDirection("owe_us")} className={chip(direction === "owe_us")}>Partner owes us</button>
          <button type="button" onClick={() => setDirection("we_owe")} className={chip(direction === "we_owe")}>We owe a partner</button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Amounts</p>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_9rem_2.25rem] gap-2">
              <input aria-label="What it's for" placeholder={i === 0 ? "Deal, invoice or month" : "Another amount"} value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} className="field" />
              <input aria-label="Amount, KES" type="number" inputMode="decimal" min="0" step="any" placeholder="KES" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} className="field num" />
              <button type="button" aria-label="Remove" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="grid size-9 place-items-center self-center rounded-full text-muted hover:bg-sunken disabled:opacity-30"><X className="size-4" /></button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => setLines((ls) => [...ls, { label: "", amount: "" }])} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1.5 text-xs text-navy-700 hover:bg-sunken"><Plus className="size-3.5" />Add amount</button>
            {presets.map((p) => (
              <button key={p.label} type="button" onClick={() => setLines([{ label: p.label, amount: String(Math.round(p.amount)) }])} className="rounded-full bg-mint-100 px-3 py-1.5 text-xs font-medium text-green hover:bg-mint/30">
                Use {p.label.toLowerCase()} · {kes(p.amount)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Percentage</p>
          <div className="flex flex-wrap items-center gap-2">
            {["5", "10", "15", "20", "25", "30", "50"].map((v) => <button key={v} type="button" onClick={() => setPct(v)} className={chip(pct === v)}>{v}%</button>)}
            <label className="flex items-center gap-1.5 text-sm text-muted">Other <input type="number" min="0" max="100" step="any" value={pct} onChange={(e) => setPct(e.target.value)} aria-label="Percentage" className="field w-20 py-1.5 text-xs" />%</label>
          </div>
        </div>

        <label className="flex flex-wrap items-center gap-2 text-sm">
          <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} className="size-4 accent-navy-900" />
          The amounts include VAT of
          <input type="number" min="0" max="100" step="any" value={vatRate} onChange={(e) => setVatRate(e.target.value)} aria-label="VAT rate" className="field w-16 py-1 text-xs" />%
          <span className="text-muted">(work out the share before VAT)</span>
        </label>
      </div>

      <div className="card space-y-4 lg:sticky lg:top-6 lg:self-start">
        <p className="label">{direction === "owe_us" ? "The partner owes Dhow" : "Dhow owes the partner"}</p>
        <p className="num text-4xl font-semibold tracking-tight text-navy-900">{kes(Math.round(r.share * 100) / 100)}</p>
        <p className="text-sm text-muted">{pct || 0}% of {kes(Math.round(r.base))}{vatIncluded ? " (before VAT)" : ""}</p>
        <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Total entered</dt><dd className="num">{kes(r.gross)}</dd></div>
          {vatIncluded ? <div className="flex justify-between"><dt className="text-muted">VAT inside it</dt><dd className="num">{kes(Math.round(r.vat * 100) / 100)}</dd></div> : null}
          <div className="flex justify-between"><dt className="text-muted">Amount the % is taken from</dt><dd className="num">{kes(Math.round(r.base * 100) / 100)}</dd></div>
          <div className="flex justify-between font-medium"><dt>{direction === "owe_us" ? "Partner keeps" : "Dhow keeps"}</dt><dd className="num">{kes(Math.round(r.rest * 100) / 100)}</dd></div>
        </dl>
        {lines.filter((l) => Number(l.amount)).length > 1 ? (
          <ul className="space-y-1 border-t border-line pt-4 text-xs text-muted">
            {lines.filter((l) => Number(l.amount)).map((l, i) => {
              const b = vatIncluded ? Number(l.amount) / (1 + (Number(vatRate) || 0) / 100) : Number(l.amount);
              return <li key={i} className="flex justify-between gap-3"><span className="truncate">{l.label || `Amount ${i + 1}`}</span><span className="num">{kes(Math.round(((b * (Number(pct) || 0)) / 100) * 100) / 100)}</span></li>;
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
