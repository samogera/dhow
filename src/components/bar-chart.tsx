import { kes } from "@/lib/format";

/** Rounded pill bars, one highlighted, as in the reference dashboards. Server-rendered SVG. */
export function BarChart({ data, highlight, money = true }: { data: { label: string; value: number }[]; highlight?: number; money?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const h = 180;
  const w = 64;
  const gap = 18;
  const hi = highlight ?? data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const width = data.length * (w + gap) - gap;
  return (
    <svg viewBox={`0 0 ${width} ${h + 28}`} className="h-auto w-full" role="img" aria-label="Bar chart">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#8fbfa5" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#2f7a57" strokeWidth="1.5" opacity="0.35" />
        </pattern>
      </defs>
      {data.map((d, i) => {
        const bh = Math.max(w * 0.6, (d.value / max) * h);
        const x = i * (w + gap);
        const y = h - bh;
        const on = i === hi;
        return (
          <g key={d.label}>
            <title>{`${d.label}: ${money ? kes(d.value) : d.value}`}</title>
            <rect x={x} y={y} width={w} height={bh} rx={w / 2} fill={on ? "#1f6345" : "url(#hatch)"} />
            {on && d.value > 0 ? (
              <g>
                <rect x={x - 6} y={Math.max(0, y - 30)} width={w + 12} height={22} rx={11} fill="#0c2e21" />
                <text x={x + w / 2} y={Math.max(0, y - 30) + 15} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="600">
                  {money ? `${Math.round(d.value / 1000)}k` : d.value}
                </text>
              </g>
            ) : null}
            <text x={x + w / 2} y={h + 20} textAnchor="middle" fontSize="12" fill="#6b6f6a">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
