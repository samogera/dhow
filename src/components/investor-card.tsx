import type { ReactNode } from "react";
import { INVESTOR_KIND } from "@/lib/investors";

export type InvestorCardData = {
  name: string; kind: string; about: string | null; sectors: string[]; stages: string[]; instruments?: string[] | null;
  ticket: string | null; countries: string | null; logo_url: string | null;
};

/** The investor as member companies see them. Used on the members' Investors page and in the investor's own preview. */
export function InvestorCard({ i, footer }: { i: InvestorCardData; footer?: ReactNode }) {
  const how = [INVESTOR_KIND[i.kind] ?? i.kind, ...(i.instruments ?? [])].filter(Boolean).join(" · ");
  return (
    <article className="flex flex-col gap-4 rounded-[1.75rem] bg-white p-6 ring-1 ring-line">
      <div className="flex items-center gap-3">
        {i.logo_url ? <img src={i.logo_url} alt="" className="size-12 rounded-xl bg-white object-contain ring-1 ring-line" /> : <span className="grid size-12 place-items-center rounded-xl bg-navy-50 text-lg font-semibold text-navy-700">{i.name[0]}</span>}
        <div className="min-w-0">
          <p className="truncate font-semibold">{i.name}</p>
          <p className="text-xs text-muted">{how}</p>
        </div>
      </div>
      {i.about ? <p className="line-clamp-4 text-sm text-ink/80">{i.about}</p> : null}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {i.ticket ? <div><dt className="text-xs text-muted">Ticket size</dt><dd className="font-medium">{i.ticket}</dd></div> : null}
        {i.countries ? <div><dt className="text-xs text-muted">Invests in</dt><dd className="font-medium">{i.countries}</dd></div> : null}
      </dl>
      {i.sectors.length || i.stages.length ? (
        <div className="flex flex-wrap gap-1.5">
          {[...i.stages, ...i.sectors].map((x) => <span key={x} className="rounded-lg bg-sunken px-2 py-1 text-xs text-ink/75">{x}</span>)}
        </div>
      ) : null}
      {footer ? <div className="mt-auto space-y-2 border-t border-line pt-4">{footer}</div> : null}
    </article>
  );
}
