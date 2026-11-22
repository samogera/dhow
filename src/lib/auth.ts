import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organization, OrgRole, Profile, StaffRole } from "@/lib/types";

export const ORG_COOKIE = "dhow_org";

/** The signed-in user and profile, or null. Cached per request. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, staff_role, avatar_url")
    .eq("id", user.id)
    .single<Profile>();
  return { user, profile: profile!, supabase };
});

export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** The member's current organization (from the org cookie, else their first one). */
export const requireMember = cache(async () => {
  const s = await requireUser();
  const { data: rows } = await s.supabase
    .from("memberships")
    .select("role, organizations(*)")
    .eq("user_id", s.user.id)
    .order("created_at");

  const list = (rows ?? []) as unknown as { role: OrgRole; organizations: Organization }[];
  if (list.length === 0) redirect("/onboarding");

  const wanted = (await cookies()).get(ORG_COOKIE)?.value;
  const current = list.find((r) => r.organizations.id === wanted) ?? list[0];
  return {
    ...s,
    org: current.organizations,
    role: current.role,
    orgs: list.map((r) => ({ id: r.organizations.id, name: r.organizations.name })),
  };
});

/** For API routes: the current membership, or null (no redirects). */
export async function memberOrNull() {
  const s = await getSession();
  if (!s) return null;
  const { data: rows } = await s.supabase
    .from("memberships")
    .select("role, organizations(*)")
    .eq("user_id", s.user.id)
    .order("created_at");
  const list = (rows ?? []) as unknown as { role: OrgRole; organizations: Organization }[];
  if (list.length === 0) return null;
  const wanted = (await cookies()).get(ORG_COOKIE)?.value;
  const current = list.find((r) => r.organizations.id === wanted) ?? list[0];
  return { ...s, org: current.organizations, role: current.role };
}

export function isOrgAdmin(role: OrgRole) {
  return role === "owner" || role === "admin";
}

/** Staff-only pages and actions. `roles` narrows further; admins always pass. */
export async function requireStaff(roles?: StaffRole[]) {
  const s = await requireUser();
  const r = s.profile?.staff_role;
  if (!r || (roles && r !== "admin" && !roles.includes(r))) redirect("/app");
  return { ...s, staffRole: r };
}

/** Same check for server actions and API routes: returns null instead of redirecting. */
export async function staffOrNull(roles?: StaffRole[]) {
  const s = await getSession();
  const r = s?.profile?.staff_role;
  if (!s || !r || (roles && r !== "admin" && !roles.includes(r))) return null;
  return { ...s, staffRole: r };
}

/** Until launch, only the Dhow team uses the system. Set MEMBER_APP_OPEN=1 in Vercel to open the member side. */
export const memberAppOpen = () => process.env.MEMBER_APP_OPEN === "1";

/** Sends people away from the member side while it's closed: staff to their workspace, everyone else to the notice. */
export async function guardMemberSide() {
  if (memberAppOpen()) return;
  const s = await getSession();
  // Before launch, Dhow staff and anyone listed in MEMBER_TESTERS (comma-separated emails) can try the member side.
  const testers = (process.env.MEMBER_TESTERS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (s?.profile?.staff_role || (s?.user.email && testers.includes(s.user.email.toLowerCase()))) return;
  redirect("/closed");
}
