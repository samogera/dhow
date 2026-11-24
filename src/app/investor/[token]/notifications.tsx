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
    <section id="notifications" className="rounded-[1.75rem] bg-white px-5 py-6 ring-1 ring-line sm:px-8 sm:py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight">Notifications</h2>
          <span title="Updates by itself while this page is open" className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-green/50" /><span className="relative inline-flex size-2 rounded-full bg-green" /></span>
          {unread ? <span className="rounded-full bg-navy-900 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">{unread} new</span> : null}
        </div>
        {unread ? <button type="button" onClick={markRead} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-900"><CheckCheck className="size-4" />Mark all read</button> : null}
      </div>
      <p className="mt-1 text-sm text-muted">{email ? <>Shown here as they happen, and emailed to {email}.</> : "Shown here as they happen. Add an email in Edit profile to get them by email too."}</p>

      {items.length ? (
        <ul className="mt-5 border-t border-line">
          {shown.map((n) => {
            const Icon = ICON[n.kind as keyof typeof ICON] ?? Bell;
            return (
              <li key={n.id} className="flex items-start gap-3.5 border-b border-line py-4 last:border-b-0">
                <Icon className={cn("mt-0.5 size-4 shrink-0", n.read_at ? "text-faint" : "text-green")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", n.read_at ? "text-ink/75" : "font-medium text-ink")}>{n.title}</p>
                  {n.body ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{n.body}</p> : null}
                </div>
                <p className="flex shrink-0 items-center gap-1.5 text-xs text-faint">
                  {n.emailed ? <Mail className="size-3" aria-label="Emailed" /> : null}{ago(n.created_at)}
                  {!n.read_at ? <span aria-label="Unread" className="ml-1 size-1.5 rounded-full bg-green" /> : null}
                </p>
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-5 border-t border-line pt-5 text-sm text-muted">Nothing yet. When a company asks to meet you or we make an introduction, you&apos;ll see it here straight away.</p>}
      {items.length > 6 ? <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 text-sm font-medium text-navy-600 hover:underline">{all ? "Show fewer" : `Show all ${items.length}`}</button> : null}
    </section>
  );
}
