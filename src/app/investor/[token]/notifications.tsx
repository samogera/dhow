"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Bell, CheckCheck, Handshake, Mail, MessageSquare, Sparkles, ThumbsUp, UserRound } from "lucide-react";
import { getInvestorFeed, markInvestorFeedRead, type InvestorNotice } from "@/actions/investor-portal";
import { cn } from "@/lib/format";

const ICON = { request: Handshake, intro: Sparkles, response: ThumbsUp, profile: UserRound, news: Bell, message: MessageSquare } as const;
const EVERY_MS = 15_000;

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Everything Dhow has sent this investor. Checks for new ones every few seconds while the page is open. */
export function InvestorNotifications({ token, initial, email }: { token: string; initial: InvestorNotice[]; email: string | null }) {
  const [items, setItems] = useState(initial);
  const [all, setAll] = useState(false);
  const [, start] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  const refresh = useCallback(async () => {
    const next = await getInvestorFeed(token).catch(() => null);
    if (next) setItems(next);
  }, [token]);

  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, EVERY_MS);
    const onShow = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onShow); };
  }, [refresh]);

  const markRead = () => start(async () => {
    setItems((xs) => xs.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    await markInvestorFeedRead(token);
  });

  const shown = all ? items : items.slice(0, 6);
  return (
    <section id="notifications" className="rounded-[1.75rem] bg-white p-5 ring-1 ring-line sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative grid size-10 place-items-center rounded-xl bg-navy-50 text-navy-700">
            <Bell className="size-5" />
            {unread ? <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-green px-1 text-[10px] font-semibold text-white">{unread}</span> : null}
          </span>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">Notifications
              <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green"><span className="size-1.5 animate-pulse rounded-full bg-green" />Live</span>
            </h2>
            <p className="text-sm text-muted">{email ? <>Also emailed to {email}, as they happen. Change this in Edit profile.</> : "Add an email in Edit profile to get these by email too."}</p>
          </div>
        </div>
        {unread ? <button type="button" onClick={markRead} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-medium hover:bg-sunken"><CheckCheck className="size-4" />Mark all read</button> : null}
      </div>

      {items.length ? (
        <ul className="mt-5 divide-y divide-line">
          {shown.map((n) => {
            const Icon = ICON[n.kind as keyof typeof ICON] ?? Bell;
            return (
              <li key={n.id} className="flex gap-3 py-3.5">
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", n.read_at ? "bg-sunken text-muted" : "bg-mint-100 text-green")}><Icon className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", n.read_at ? "text-ink/80" : "font-semibold text-ink")}>{n.title}</p>
                  {n.body ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{n.body}</p> : null}
                  <p className="mt-1 flex items-center gap-2 text-xs text-faint">{ago(n.created_at)}{n.emailed ? <span className="inline-flex items-center gap-1"><Mail className="size-3" />emailed</span> : null}</p>
                </div>
                {!n.read_at ? <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-green" /> : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-5 rounded-2xl border border-dashed border-line px-6 py-6 text-center text-sm text-muted">Nothing yet. When a company asks to meet you or we make an introduction, it shows here straight away.</p>}
      {items.length > 6 ? <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-sm font-medium text-navy-600 hover:underline">{all ? "Show fewer" : `Show all ${items.length}`}</button> : null}
    </section>
  );
}
