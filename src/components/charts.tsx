import Link from "next/link";
import { cn } from "@/lib/format";

// Server-rendered charts: one series, one hue (navy), recessive grid, thin marks with
// rounded data-ends on the baseline, and a hover tooltip on every mark.

export type Point = { label: string; value: number; note?: string };

/** Round axis maximum and 3–4 tick values. */
function ticks(max: number) {
  if (max <= 0) return { top: 4, steps: [0, 1, 2, 3, 4] };
  const rough = max / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
  const s = Math.max(1, Math.ceil(step));
  const top = s * Math.ceil(max / s);
  return { top, steps: Array.from({ length: Math.round(top / s) + 1 }, (_, i) => i * s) };
}
const fmt = (n: number) => new Intl.NumberFormat("en-KE", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);

function Grid({ steps, top }: { steps: number[]; top: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {steps.map((t) => (
        <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / top) * 100}%` }}>
          <span className="num w-7 shrink-0 -translate-y-px text-right text-[11px] leading-none text-faint">{fmt(t)}</span>
          <span className={cn("h-px flex-1", t === 0 ? "bg-navy-100" : "border-t border-dashed border-line")} />
        </div>
      ))}
    </div>
  );
}

function Tip({ p, unit, money }: { p: Point; unit: string; money?: boolean }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-navy-950 px-3 py-2 text-left text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
      <span className="block text-[11px] text-white/60">{p.label}</span>
      <span className="num block font-semibold">{money ? `KSh ${new Intl.NumberFormat("en-KE").format(p.value)}` : `${fmt(p.value)} ${unit}`}</span>
      {p.note ? <span className="block text-[11px] text-white/70">{p.note}</span> : null}
    </span>
  );
}

/** Vertical columns, one per period. The latest period carries a direct label. */
export function ColumnChart({ data, unit = "", height = 220, label, money }: { data: Point[]; unit?: string; height?: number; label: string; money?: boolean }) {
  const { top, steps } = ticks(Math.max(0, ...data.map((d) => d.value)));
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <figure aria-label={label}>
      <div className="relative" style={{ height }}>
        <Grid steps={steps} top={top} />
        <div className="absolute inset-y-0 right-0 left-9 flex items-end gap-1.5 sm:gap-2.5">
          {data.map((d, i) => {
            const last = i === data.length - 1;
            const h = (d.value / top) * 100;
            return (
              <div key={d.label} tabIndex={0} aria-label={`${d.label}: ${d.value} ${unit}`} className="group relative flex h-full flex-1 items-end justify-center outline-none">
                <span className="absolute inset-x-0 bottom-0 top-0 rounded-lg transition group-hover:bg-navy-50/70" />
                {d.value > 0 ? (
                  <span className={cn("relative w-full max-w-7 rounded-t-[4px] transition", last ? "bg-navy-900" : "bg-navy-500 group-hover:bg-navy-700")} style={{ height: `${h}%` }}>
                    {last ? <span className="num absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-ink">{fmt(d.value)}</span> : null}
                  </span>
                ) : null}
                <Tip p={d} unit={unit} money={money} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 ml-9 flex gap-1.5 sm:gap-2.5">
        {data.map((d, i) => <span key={d.label} className={cn("flex-1 text-center text-[11px]", i === data.length - 1 ? "font-semibold text-ink" : "text-faint")}>{d.label}</span>)}
      </div>
      {total === 0 ? <figcaption className="mt-3 text-center text-xs text-muted">Nothing recorded in this period yet.</figcaption> : null}
    </figure>
  );
}

/** A running total as a line with a soft area; hover any period for its value. */
export function AreaChart({ data, unit = "", height = 220, label }: { data: Point[]; unit?: string; height?: number; label: string }) {
  const { top, steps } = ticks(Math.max(0, ...data.map((d) => d.value)));
  const n = data.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / top) * 100;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L100,100 L0,100 Z`;
  const last = data[n - 1];
  return (
    <figure aria-label={label}>
      <div className="relative" style={{ height }}>
        <Grid steps={steps} top={top} />
        <div className="absolute inset-y-0 right-3 left-9">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-navy-500)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-navy-500)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#area-fill)" />
            <path d={line} fill="none" stroke="var(--color-navy-700)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          {data.map((d, i) => (
            <div key={d.label} tabIndex={0} aria-label={`${d.label}: ${d.value} ${unit}`}
              className="group absolute inset-y-0 -translate-x-1/2 outline-none" style={{ left: `${x(i)}%`, width: `${100 / Math.max(n - 1, 1)}%` }}>
              <span className="absolute inset-y-0 left-1/2 w-px bg-navy-300 opacity-0 transition group-hover:opacity-100" />
              <span className={cn("absolute left-1/2 size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-navy-700 shadow transition",
                i === n - 1 ? "size-3 bg-navy-900" : "opacity-0 group-hover:opacity-100")} style={{ bottom: `${100 - y(d.value)}%` }} />
              <span className="absolute left-1/2" style={{ bottom: `${100 - y(d.value)}%` }}><span className="relative block"><Tip p={d} unit={unit} /></span></span>
            </div>
          ))}
          {last ? <span className="num absolute -translate-x-full -translate-y-full pr-1 pb-2 text-xs font-semibold text-ink" style={{ left: "100%", top: `${y(last.value)}%` }}>{fmt(last.value)}</span> : null}
        </div>
      </div>
      <div className="relative mt-2 mr-3 ml-9 h-4">
        {data.map((d, i) => (
          <span key={d.label} className={cn("absolute -translate-x-1/2 text-[11px]", i === n - 1 ? "font-semibold text-ink" : "text-faint", n > 8 && i % 2 === 1 && i !== n - 1 && "hidden sm:inline")} style={{ left: `${x(i)}%` }}>{d.label}</span>
        ))}
      </div>
    </figure>
  );
}

/** Parts of a whole as ranked horizontal bars: one hue, the label and numbers written beside each bar. */
export function BarList({ rows, total, empty = "No data yet." }: { rows: { label: string; value: number; href?: string }[]; total: number; empty?: string }) {
  const shown = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  if (!total || !shown.length) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  const max = shown[0].value;
  return (
    <ul className="space-y-3.5">
      {shown.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${r.value} (${Math.round((r.value / total) * 100)}%)`}>
          <div className="mb-1.5 flex items-baseline gap-2 text-sm">
            {r.href ? <a href={r.href} className="min-w-0 flex-1 truncate text-ink/85 hover:text-navy-700">{r.label}</a> : <span className="min-w-0 flex-1 truncate text-ink/85">{r.label}</span>}
            <span className="num font-semibold text-ink">{r.value}</span>
            <span className="num w-9 text-right text-xs text-muted">{Math.round((r.value / total) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-sunken">
            <div className="h-full rounded-full bg-navy-500 transition group-hover:bg-navy-700" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Share of a whole as a ring with the total in the middle. Each slice is named in the legend with its number. */
export function Donut({ rows, center, sub, empty = "No data yet." }: { rows: { label: string; value: number; color: string; href?: string }[]; center: string; sub: string; empty?: string }) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-muted">{empty}</p>;
  const R = 42, C = 2 * Math.PI * R, gap = rows.filter((r) => r.value).length > 1 ? 1.5 : 0;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative size-44 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${center} ${sub}`}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-navy-50)" strokeWidth="11" />
          {rows.filter((r) => r.value).map((r) => {
            const len = (r.value / total) * C;
            const el = (
              <circle key={r.label} cx="50" cy="50" r={R} fill="none" stroke={r.color} strokeWidth="11" strokeLinecap="butt"
                strokeDasharray={`${Math.max(len - gap, 0.01)} ${C}`} strokeDashoffset={-acc} className="transition-opacity hover:opacity-80">
                <title>{`${r.label}: ${r.value} (${Math.round((r.value / total) * 100)}%)`}</title>
              </circle>
            );
            acc += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <p className="num text-2xl font-semibold tracking-tight">{center}</p>
          <p className="text-[11px] text-muted">{sub}</p>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
            {r.href ? <a href={r.href} className="min-w-0 flex-1 truncate hover:text-navy-700">{r.label}</a> : <span className="min-w-0 flex-1 truncate">{r.label}</span>}
            <span className="num font-semibold">{r.value}</span>
            <span className="num w-9 text-right text-xs text-muted">{Math.round((r.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A small segmented control that switches a chart's range through the URL (?range=3). */
export function RangeTabs({ value, options, param = "range", base }: { value: number; options: number[]; param?: string; base: string }) {
  return (
    <div className="inline-flex rounded-full bg-navy-50/80 p-1 text-xs">
      {options.map((o) => (
        <Link key={o} href={`${base}?${param}=${o}`} scroll={false} aria-current={o === value ? "true" : undefined}
          className={cn("rounded-full px-3 py-1.5 font-medium transition", o === value ? "bg-white text-navy-900 shadow-sm" : "text-muted hover:text-ink")}>{o} months</Link>
      ))}
    </div>
  );
}
