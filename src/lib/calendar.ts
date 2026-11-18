import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";

// Google Calendar, read-only. Each staff member connects their own calendar.

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly openid email";
const redirectUri = () => `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`;

export function calendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function authUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(userId: string, code: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const j = (await r.json()) as { refresh_token?: string; id_token?: string; error?: string };
  if (!r.ok || !j.refresh_token) throw new Error(j.error ?? "Google did not return a refresh token");
  const email = j.id_token ? (JSON.parse(Buffer.from(j.id_token.split(".")[1], "base64url").toString()) as { email?: string }).email : null;
  await createAdminClient().from("calendar_connections").upsert({
    user_id: userId,
    google_email: email ?? null,
    refresh_token_enc: encrypt(j.refresh_token),
    connected_at: new Date().toISOString(),
  });
}

async function accessToken(userId: string) {
  const { data } = await createAdminClient().from("calendar_connections").select("refresh_token_enc").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: decrypt(data.refresh_token_enc),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  return ((await r.json()) as { access_token: string }).access_token;
}

export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  link?: string;
  attendees: number;
}

/** Upcoming events on the user's primary calendar. null = not connected. */
export async function upcomingEvents(userId: string, days = 7): Promise<CalEvent[] | null> {
  const token = await accessToken(userId);
  if (!token) return null;
  const now = new Date();
  const p = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + days * 86_400_000).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { items?: Record<string, any>[] };
  return (j.items ?? []).map((e) => ({
    id: e.id,
    title: e.summary ?? "(no title)",
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
    allDay: !e.start?.dateTime,
    location: e.location,
    link: e.hangoutLink ?? e.htmlLink,
    attendees: e.attendees?.length ?? 0,
  }));
}
