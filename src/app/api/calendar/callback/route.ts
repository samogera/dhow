import { handleCalendarCallback } from "@/lib/calendar-callback";

export function GET(req: Request) {
  return handleCalendarCallback(req, "google");
}
