import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { connections, PROVIDER_LABEL, providerConfigured, upcomingEvents, type CalendarProvider, type CalEvent } from "@/lib/calendar";
import { ButtonAnchor, Card, Empty, PageHeader } from "@/components/ui";
import { ConfirmSubmit } from "@/components/forms";
import { cn, time } from "@/lib/format";
import { disconnectCalendar } from "@/actions/admin";

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

  return (
    <>
      <PageHeader title="Calendar" sub="Your next two weeks from Google and Outlook, in one place. Dhow only reads your events." />
      {connected ? <p className="mb-4 rounded-2xl bg-good/10 px-4 py-3 text-sm text-good">{PROVIDER_LABEL[connected as CalendarProvider] ?? "Calendar"} is connected.</p> : null}
      {error ? <p className="mb-4 rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">{ERRORS[error] ?? "Something went wrong."}</p> : null}

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
