"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";

export type Rate = { service: string; pct: number | null };

/** Rows of "service + percentage". Sent as repeated rate_service / rate_pct fields. */
export function ServiceRates({ value }: { value?: Rate[] }) {
  const [rows, setRows] = useState<{ key: number; service: string; pct: string }[]>(() => {
    const start = (value ?? []).map((r, i) => ({ key: i, service: r.service, pct: r.pct == null ? "" : String(r.pct) }));
    return start.length ? start : [{ key: 0, service: "", pct: "" }];
  });
  const set = (key: number, patch: Partial<{ service: string; pct: string }>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-2">
          <input name="rate_service" value={r.service} onChange={(e) => set(r.key, { service: e.target.value })} placeholder="e.g. HR 360" aria-label="Service" className="field min-w-0 flex-1" maxLength={120} />
          <div className="relative w-24 shrink-0">
            <input name="rate_pct" value={r.pct} onChange={(e) => set(r.key, { pct: e.target.value })} type="number" min="0" max="100" step="any" inputMode="decimal" placeholder="15" aria-label="Percentage" className="field pr-8" />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">%</span>
          </div>
          <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [{ key: r.key + 1, service: "", pct: "" }]))} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink" aria-label="Remove row"><X className="size-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => setRows((rs) => [...rs, { key: Math.max(...rs.map((x) => x.key)) + 1, service: "", pct: "" }])} className="inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-sm font-medium text-navy-600"><Plus className="size-4" />Add a service</button>
    </div>
  );
}
