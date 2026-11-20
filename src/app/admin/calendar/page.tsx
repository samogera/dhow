import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { calendarConfigured, upcomingEvents, type CalEvent } from "@/lib/calendar";
import { ButtonAnchor, ButtonLink, Card, Empty, PageHeader } from "@/components/ui";
import { ConfirmSubmit } from "@/components/forms";
import { time } from "@/lib/format";
import { disconnectCalendar } from "@/actions/admin";

export const metadata: Metadata = { title: "Calendar" };

const ERRORS: Record<string, string> = {
  state: "The connection link expired. Please try again.",
  google: "Google didn't accept the connection. Please try again.",
  config: "Google Calendar isn't set up on this server yet.",
};
const dayKey = (e: CalEvent) => e.start.slice(0, 10);
const dayFmt = new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "short", timeZone: "Africa/Nairobi" });

export default async function Calendar({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const s = await requireStaff();
  const { connected, error } = await searchParams;
  const configured = calendarConfigured();
  const events = configured ? await upcomingEvents(s.user.id, 14) : null;
  const days = events ? [...new Set(events.map(dayKey))] : [];

  return (
    <>
      <PageHeader title="Calendar" sub="Your next two weeks, from Google Calendar.">
        {events ? (
          <form action={disconnectCalendar}><ConfirmSubmit variant="ghost" message="Disconnect Google Calendar?">Disconnect</ConfirmSubmit></form>
        ) : null}
      </PageHeader>
      {connected ? <p className="mb-4 rounded-2xl bg-good/10 px-4 py-3 text-sm text-good">Google Calendar is connected.</p> : null}
      {error ? <p className="mb-4 rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">{ERRORS[error] ?? "Something went wrong."}</p> : null}

      {!configured ? (
        <Empty title="Google Calendar isn't set up yet" sub="Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the server environment." />
      ) : events === null ? (
        <Empty title="Connect your calendar" sub="See your meetings next to your tasks and deadlines. Dhow only reads your events.">
          <ButtonAnchor href="/api/calendar/connect">Connect Google Calendar</ButtonAnchor>
        </Empty>
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
                    <span className="num w-24 shrink-0 text-sm text-muted">{e.allDay ? "All day" : `${time(e.start)}–${time(e.end)}`}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="truncate text-xs text-muted">{[e.location, e.attendees > 1 ? `${e.attendees} people` : null].filter(Boolean).join(" · ")}</p>
                    </div>
                    {e.link ? <a href={e.link} target="_blank" rel="noopener noreferrer" className="rounded-full bg-mint px-3 py-1.5 text-xs font-medium">Join</a> : null}
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
