import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import { keys } from "@/lib/env-alias";
import { appUrl } from "@/lib/app-url";

// Read-only calendars. Each staff member can connect a Google calendar and an
// Outlook / Microsoft 365 calendar; events from both are shown together.

export type CalendarProvider = "google" | "microsoft";
export const PROVIDER_LABEL: Record<CalendarProvider, string> = { google: "Google Calendar", microsoft: "Outlook / Microsoft 365" };

const APP = () => appUrl();
const REDIRECT: Record<CalendarProvider, () => string> = {
  google: () => `${APP()}/api/calendar/callback`,
  microsoft: () => `${APP()}/api/calendar/callback/microsoft`,
};
const MS_TENANT = () => keys.microsoftTenant();
const MS_SCOPE = "openid email offline_access User.Read Calendars.Read";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.readonly openid email";

export function providerConfigured(p: CalendarProvider) {
  return p === "google"
    ? Boolean(keys.googleClientId() && keys.googleClientSecret())
    : Boolean(keys.microsoftClientId() && keys.microsoftClientSecret());
}
export function calendarConfigured() {
  return providerConfigured("google") || providerConfigured("microsoft");
}

export function authUrl(p: CalendarProvider, state: string) {
  if (p === "google") {
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: keys.googleClientId()!, redirect_uri: REDIRECT.google(), response_type: "code",
      scope: GOOGLE_SCOPE, access_type: "offline", prompt: "consent", state,
    })}`;
  }
  return `https://login.microsoftonline.com/${MS_TENANT()}/oauth2/v2.0/authorize?${new URLSearchParams({
    client_id: keys.microsoftClientId()!, redirect_uri: REDIRECT.microsoft(), response_type: "code",
    response_mode: "query", scope: MS_SCOPE, prompt: "select_account", state,
  })}`;
}

type TokenResponse = { access_token?: string; refresh_token?: string; id_token?: string; error?: string; error_description?: string };

async function tokenRequest(p: CalendarProvider, body: Record<string, string>): Promise<TokenResponse & { ok: boolean }> {
  const url = p === "google" ? "https://oauth2.googleapis.com/token" : `https://login.microsoftonline.com/${MS_TENANT()}/oauth2/v2.0/token`;
  const creds: Record<string, string> = p === "google"
    ? { client_id: keys.googleClientId()!, client_secret: keys.googleClientSecret()! }
    : { client_id: keys.microsoftClientId()!, client_secret: keys.microsoftClientSecret()!, scope: MS_SCOPE };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...creds, ...body }),
    cache: "no-store",
  });
  const j = (await r.json().catch(() => ({}))) as TokenResponse;
  return { ...j, ok: r.ok };
}

function emailFromIdToken(idToken?: string) {
  if (!idToken) return null;
  try {
    const c = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString()) as { email?: string; preferred_username?: string };
    return c.email ?? c.preferred_username ?? null;
  } catch {
    return null;
  }
}

export async function exchangeCode(p: CalendarProvider, userId: string, code: string) {
  const j = await tokenRequest(p, { code, redirect_uri: REDIRECT[p](), grant_type: "authorization_code" });
  if (!j.ok || !j.refresh_token) throw new Error(j.error_description ?? j.error ?? "No refresh token returned");
  await createAdminClient().from("calendar_connections").upsert({
    user_id: userId,
    provider: p,
    google_email: emailFromIdToken(j.id_token),
    refresh_token_enc: encrypt(j.refresh_token),
    connected_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });
}

export interface CalendarConnection { provider: CalendarProvider; email: string | null }

export async function connections(userId: string): Promise<CalendarConnection[]> {
  const { data } = await createAdminClient().from("calendar_connections").select("provider, google_email").eq("user_id", userId);
  return (data ?? []).map((c) => ({ provider: c.provider as CalendarProvider, email: c.google_email }));
}

async function accessToken(p: CalendarProvider, userId: string) {
  const db = createAdminClient();
  const { data } = await db.from("calendar_connections").select("refresh_token_enc").eq("user_id", userId).eq("provider", p).maybeSingle();
  if (!data) return null;
  const j = await tokenRequest(p, { refresh_token: decrypt(data.refresh_token_enc), grant_type: "refresh_token" });
  if (!j.ok || !j.access_token) return null;
  // Microsoft rotates refresh tokens: keep the newest one.
  if (j.refresh_token) await db.from("calendar_connections").update({ refresh_token_enc: encrypt(j.refresh_token) }).eq("user_id", userId).eq("provider", p);
  return j.access_token;
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
  source: CalendarProvider;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function googleEvents(token: string, from: Date, to: Date): Promise<CalEvent[]> {
  const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "100" });
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) return [];
  const j = (await r.json()) as { items?: Record<string, any>[] };
  return (j.items ?? []).filter((e) => e.status !== "cancelled").map((e) => ({
    id: `g-${e.id}`,
    title: e.summary ?? "(no title)",
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
    allDay: !e.start?.dateTime,
    location: e.location,
    link: e.hangoutLink ?? e.conferenceData?.entryPoints?.[0]?.uri,
    attendees: e.attendees?.length ?? 0,
    source: "google" as const,
  }));
}

async function microsoftEvents(token: string, from: Date, to: Date): Promise<CalEvent[]> {
  const q = new URLSearchParams({
    startDateTime: from.toISOString(), endDateTime: to.toISOString(),
    $orderby: "start/dateTime", $top: "100",
    $select: "id,subject,start,end,isAllDay,isCancelled,location,onlineMeeting,attendees",
  });
  const r = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${q}`, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="Africa/Nairobi"' },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const j = (await r.json()) as { value?: Record<string, any>[] };
  // Times come back in Nairobi time without an offset; add it so they sort and display correctly.
  const withOffset = (s?: string) => (s ? `${s.slice(0, 19)}+03:00` : s ?? "");
  return (j.value ?? []).filter((e) => !e.isCancelled).map((e) => ({
    id: `m-${e.id}`,
    title: e.subject || "(no title)",
    start: e.isAllDay ? e.start?.dateTime?.slice(0, 10) : withOffset(e.start?.dateTime),
    end: e.isAllDay ? e.end?.dateTime?.slice(0, 10) : withOffset(e.end?.dateTime),
    allDay: Boolean(e.isAllDay),
    location: e.location?.displayName || undefined,
    link: e.onlineMeeting?.joinUrl,
    attendees: e.attendees?.length ?? 0,
    source: "microsoft" as const,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Upcoming events from every calendar the user has connected, merged and sorted. null = nothing connected. */
export async function upcomingEvents(userId: string, days = 7): Promise<CalEvent[] | null> {
  const conns = await connections(userId);
  if (!conns.length) return null;
  const from = new Date();
  const to = new Date(from.getTime() + days * 86_400_000);
  const lists = await Promise.all(conns.map(async (c) => {
    if (!providerConfigured(c.provider)) return [];
    const token = await accessToken(c.provider, userId);
    if (!token) return [];
    return c.provider === "google" ? googleEvents(token, from, to) : microsoftEvents(token, from, to);
  }));
  const key = (e: CalEvent) => (e.allDay ? `${e.start}T00:00:00+03:00` : e.start);
  return lists.flat().sort((a, b) => new Date(key(a)).getTime() - new Date(key(b)).getTime());
}
