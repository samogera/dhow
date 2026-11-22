// Minimal iCalendar (RFC 5545) writer for all-day reminder events.

export type IcsEvent = {
  uid: string;
  date: string; // YYYY-MM-DD (all-day)
  title: string;
  description?: string;
  url?: string;
  /** Reminder offsets in minutes before 00:00 of the event day. Negative = after midnight, e.g. -480 = 8:00 the same day. */
  alarms?: number[];
};

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = (d: string) => d.replace(/-/g, "");
const nextDay = (d: string) => new Date(new Date(`${d}T00:00:00Z`).getTime() + 864e5).toISOString().slice(0, 10);
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Lines longer than 75 octets are folded with CRLF + space. */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ""; }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function trigger(minutes: number) {
  const m = Math.abs(minutes);
  const h = Math.floor(m / 60), r = m % 60;
  return `${minutes >= 0 ? "-" : ""}PT${h ? `${h}H` : ""}${r || !h ? `${r}M` : ""}`;
}

export function buildIcs(name: string, events: IcsEvent[]) {
  const now = stamp();
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dhow Partners//Workspace//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`, "X-WR-TIMEZONE:Africa/Nairobi", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@dhowpartners.com`, `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(nextDay(e.date))}`,
      `SUMMARY:${esc(e.title)}`, "TRANSP:TRANSPARENT");
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description + (e.url ? `\n${e.url}` : ""))}`);
    if (e.url) lines.push(`URL:${e.url}`);
    for (const a of e.alarms ?? []) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, `TRIGGER:${trigger(a)}`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
