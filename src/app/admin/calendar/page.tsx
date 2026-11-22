import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { connections, PROVIDER_LABEL, providerConfigured, upcomingEvents, type CalendarProvider, type CalEvent } from "@/lib/calendar";
import { ButtonAnchor, Card, Empty, PageHeader } from "@/components/ui";
import { ConfirmSubmit } from "@/components/forms";
import { cn, time } from "@/lib/format";
import { disconnectCalendar, makeCalendarFeed, saveEmailPrefs, sendMyAlertsNow } from "@/actions/admin";
import { ActionForm } from "@/components/forms";
import { CopyField } from "@/components/copy-field";
import { appUrl } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { BellRing, CalendarPlus, Mail } from "lucide-react";

export const metadata: Metadata = { title: "Calendar" };

const ERRORS: Record<string, string> = {
  state: "The connection link expired. Please try again.",
  google: "Google didn't accept the connection. Please try again.",
  microsoft: "Microsoft didn't accept the connection. Please try again.",
  config: "That calendar isn't set up on the server yet. Add its keys in Vercel first.",
};
const PROVIDERS: CalendarProvider[] = ["google", "microsoft"];
const DOT: Record<CalendarProvider, string> = { google: "bg-green", microsoft: "bg-navy-500" };
const dayKey = (e: CalEvent) => e.start.slice(0, 10);
const dayFmt = new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "short", timeZone: "Africa/Nairobi" });

export default async function Calendar({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const s = await requireStaff();
  const { connected, error } = await searchParams;
  const [conns, events] = await Promise.all([connections(s.user.id), upcomingEvents(s.user.id, 14)]);
  const days = events ? [...new Set(events.map(dayKey))] : [];
  const { data: me } = await createAdminClient().from("profiles").select("calendar_token, daily_digest, instant_emails").eq("id", s.user.id).single();
  const feed = me?.calendar_token ? `${appUrl()}/api/calendar/feed/${me.calendar_token}.ics` : null;
  const webcal = feed?.replace(/^https?:/, "webcal:");

  return (
    <>
      <PageHeader title="Calendar" sub="Your meetings from Google and Outlook, plus every Dhow deadline in your own calendar." />
      {connected ? <p className="mb-4 rounded-2xl bg-good/10 px-4 py-3 text-sm text-good">{PROVIDER_LABEL[connected as CalendarProvider] ?? "Calendar"} is connected.</p> : null}
      {error ? <p className="mb-4 rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">{ERRORS[error] ?? "Something went wrong."}</p> : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber/15 text-amber-700"><CalendarPlus className="size-5" /></span>
            <div className="min-w-0">
              <p className="font-semibold">Deadlines in your own calendar</p>
              <p className="mt-0.5 text-sm text-muted">Your tasks, expiring licences and documents, invoices and bills due, and lead follow-ups appear as all-day events with reminders. Late items stay on today until they&apos;re done. It updates by itself.</p>
            </div>
          </div>
          {feed ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <ButtonAnchor href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal!)}`} target="_blank" rel="noopener noreferrer">Add to Google Calendar</ButtonAnchor>
                <ButtonAnchor href={webcal!} variant="outline">Add to iPhone or Outlook</ButtonAnchor>
              </div>
              <CopyField value={feed} />
              <p className="text-xs text-faint">Private link: anyone who has it can see these dates. Google refreshes it every few hours; phones and Outlook more often.</p>
              <form action={makeCalendarFeed}><button className="text-xs text-muted underline">Make a new link (the old one stops working)</button></form>
            </div>
          ) : (
            <form action={makeCalendarFeed} className="mt-4"><button className="rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-white">Create my calendar link</button></form>
          )}
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-mint-100 text-green"><Mail className="size-5" /></span>
            <div>
              <p className="font-semibold">Email me</p>
              <p className="mt-0.5 text-sm text-muted">Sent to {s.user.email}.</p>
            </div>
          </div>
          <form action={saveEmailPrefs} className="mt-4 space-y-3 text-sm">
            <label className="flex items-start gap-2.5"><input type="checkbox" name="daily_digest" defaultChecked={me?.daily_digest ?? true} className="mt-0.5 accent-navy-900" /><span><span className="font-medium">Morning alerts</span><br /><span className="text-muted">At 7am, what&apos;s urgent or coming up. Only on days there&apos;s something.</span></span></label>
            <label className="flex items-start gap-2.5"><input type="checkbox" name="instant_emails" defaultChecked={me?.instant_emails ?? true} className="mt-0.5 accent-navy-900" /><span><span className="font-medium">Right away</span><br /><span className="text-muted">Tasks given to you, reviews waiting, payments received, partner uploads and new reviews.</span></span></label>
            <button className="rounded-full border border-line px-4 py-2 text-sm font-medium"><BellRing className="mr-1.5 inline size-4" />Save</button>
          </form>
          <ActionForm action={sendMyAlertsNow} submit="Send me my alerts now" submitVariant="outline" className="mt-4 border-t border-line pt-4">{null}</ActionForm>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((p) => {
          const c = conns.find((x) => x.provider === p);
          return (
            <Card key={p} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={cn("size-2.5 rounded-full", c ? DOT[p] : "bg-line")} />
                <div>
                  <p className="font-semibold">{PROVIDER_LABEL[p]}</p>
                  <p className="text-sm text-muted">{c ? c.email ?? "Connected" : providerConfigured(p) ? "Not connected" : "Needs setting up on the server"}</p>
                </div>
              </div>
              {c ? (
                <form action={disconnectCalendar}>
                  <input type="hidden" name="provider" value={p} />
                  <ConfirmSubmit variant="ghost" message={`Disconnect ${PROVIDER_LABEL[p]}?`}>Disconnect</ConfirmSubmit>
                </form>
              ) : providerConfigured(p) ? (
                <ButtonAnchor href={`/api/calendar/connect?provider=${p}`} variant="outline">Connect</ButtonAnchor>
              ) : null}
            </Card>
          );
        })}
      </div>

      {events === null ? (
        <Empty title="No calendar connected yet" sub="Connect Google Calendar, Outlook, or both. Your meetings will show here and on your dashboard." />
      ) : events.length === 0 ? (
        <Empty title="Nothing in the next two weeks" />
      ) : (
        <div className="space-y-4">
          {days.map((d) => (
            <Card key={d}>
              <p className="label mb-3">{dayFmt.format(new Date(`${d}T12:00:00+03:00`))}</p>
              <ul className="divide-y divide-line">
                {events.filter((e) => dayKey(e) === d).map((e) => (
                  <li key={e.id} className="flex items-center gap-4 py-3">
                    <span className={cn("size-2 shrink-0 rounded-full", DOT[e.source])} title={PROVIDER_LABEL[e.source]} />
                    <span className="num w-28 shrink-0 text-sm text-muted">{e.allDay ? "All day" : `${time(e.start)}–${time(e.end)}`}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="truncate text-xs text-muted">{[e.location, e.attendees > 1 ? `${e.attendees} people` : null, e.source === "microsoft" ? "Outlook" : "Google"].filter(Boolean).join(" · ")}</p>
                    </div>
                    {e.link ? <a href={e.link} target="_blank" rel="noopener noreferrer" className="rounded-full bg-mint px-3 py-1.5 text-xs font-medium text-navy-950">Join</a> : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
