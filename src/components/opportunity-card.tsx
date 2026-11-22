import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, CalendarDays, Check, Lock, MapPin, Star } from "lucide-react";
import { Poster } from "@/components/poster";
import { cn, day, daysUntil } from "@/lib/format";
import { credit, eventDates, kindLabel } from "@/lib/opportunity-display";
import { splitTitle } from "@/lib/opportunity-parse";

export type CardOpp = {
  id: string; kind: string; title: string; summary: string; source: string | null; url: string | null; apply_url: string | null;
  imported_at: string | null; location: string | null; deadline: string | null; requires_verified: boolean; image_url: string | null;
  benefits: string[]; featured: boolean; starts_on: string | null; ends_on: string | null; published?: boolean; audience?: string | null;
};

/** A gallery card: poster, kind, a clear headline, who it's for, the highlight, and where it came from. */
export function OpportunityCard({ o, href, status, footer, locked, reason, planLocked }: { o: CardOpp; href: string; status?: ReactNode; footer?: ReactNode; locked?: boolean; reason?: string | null; planLocked?: boolean }) {
  const t = splitTitle(o.title);
  const left = o.deadline ? daysUntil(o.deadline) : null;
  const ev = eventDates(o);
  const from = credit(o);
  const highlight = t.tag ?? o.benefits?.[0] ?? null;
  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(13,28,41,0.22)]">
      <Link href={href} className="flex flex-1 flex-col">
        <div className="relative">
          <Poster src={o.image_url} kind={o.kind} className="aspect-[16/10]" />
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-navy-900 shadow-sm">{kindLabel(o.kind)}</span>
              {o.audience && o.audience !== "all" ? (
                <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm", planLocked ? "bg-navy-900 text-white" : "bg-mint-100 text-green")}>
                  {planLocked ? <Lock className="size-3" /> : null}{o.audience === "premium" ? "Growth" : "Members"}
                </span>
              ) : null}
              {o.featured ? <span className="flex items-center gap-1 rounded-full bg-amber px-2.5 py-1 text-[11px] font-semibold text-navy-950 shadow-sm"><Star className="size-3 fill-current" />Recommended</span> : null}
            </div>
            {status ?? (left !== null && left >= 0 ? (
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm", left <= 7 ? "bg-bad text-white" : "bg-white/95 text-ink")}>
                {left === 0 ? "Closes today" : `${left} day${left === 1 ? "" : "s"} left`}
              </span>
            ) : null)}
          </div>
          {ev ? (
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-navy-950/85 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <CalendarDays className="size-3.5" />{day(ev.start)}{ev.end ? ` – ${day(ev.end)}` : ""}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-5">
          {reason ? <p className="mb-2 flex items-center gap-1 self-start rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-semibold text-green"><Check className="size-3" />{reason}</p> : null}
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{from.byDhow ? "Dhow Partners" : from.label}</p>
          <h3 className="mt-1.5 line-clamp-3 text-[1.05rem] leading-snug font-semibold text-navy-900 group-hover:text-navy-700">{t.headline}</h3>
          {t.sub ? <p className="mt-1 line-clamp-2 text-sm text-muted">{t.sub}</p> : null}
          {highlight ? <p className="mt-3 line-clamp-2 self-start rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">{highlight}</p> : null}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-muted">
            {o.location ? <span className="flex items-center gap-1"><MapPin className="size-3" />{o.location}</span> : null}
            <span>{o.deadline ? `Closes ${day(o.deadline)}` : "Rolling"}</span>
            {o.requires_verified ? <span className={cn("flex items-center gap-1 font-medium", locked ? "text-amber-700" : "text-green")}><BadgeCheck className="size-3.5" />Verified only</span> : null}
            <span className="ml-auto font-medium text-navy-600 group-hover:translate-x-0.5 transition">View details →</span>
          </div>
        </div>
      </Link>
      {footer ? <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">{footer}</div> : null}
    </article>
  );
}
