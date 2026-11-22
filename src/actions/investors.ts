"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { staffOrNull } from "@/lib/auth";
import { friendlyError } from "@/lib/form-errors";
import { isFile, uploadImage } from "@/lib/storage";
import type { ActionState } from "@/components/forms";

const text = (max = 500) => z.string().trim().max(max).optional().transform((v) => v || null);
const list = z.string().optional().transform((v) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10));

const InvestorIn = z.object({
  id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  name: z.string().trim().min(2, "Add the investor's name").max(120),
  kind: z.enum(["fund", "angel", "bank", "dfi", "corporate", "grant"]),
  about: text(1200),
  sectors: list,
  stages: list,
  ticket: text(80),
  countries: text(120),
  website: z.string().trim().url("Use a full web address, like https://…").optional().or(z.literal("")).transform((v) => v || null),
  contact_name: text(120),
  active: z.enum(["on"]).optional().transform((v) => v === "on"),
});

export async function saveInvestor(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return { error: "You don't have access to do that." };
  const values = Object.fromEntries(fd);
  const p = InvestorIn.safeParse(values);
  if (!p.success) return friendlyError(p.error, values);
  const { id, ...row } = p.data;
  const logo = fd.get("logo");
  let logo_url: string | undefined;
  if (isFile(logo)) {
    const up = await uploadImage(logo, "investors");
    if ("error" in up) return { error: up.error };
    logo_url = up.url;
  }
  const data = { ...row, ...(logo_url ? { logo_url } : {}) };
  const { error } = id ? await s.supabase.from("investors").update(data).eq("id", id) : await s.supabase.from("investors").insert(data);
  if (error) return { error: "Couldn't save the investor. Try again." };
  revalidatePath("/admin/investors");
  revalidatePath("/app/investors");
  return { ok: "Investor saved." };
}

export async function setRequestStatus(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: z.string().uuid(), status: z.enum(["new", "in_progress", "done", "declined"]), staff_note: text(1000) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  await s.supabase.from("member_requests").update({ status: p.data.status, ...(p.data.staff_note !== null ? { staff_note: p.data.staff_note } : {}) }).eq("id", p.data.id);
  revalidatePath("/admin/requests");
}

export async function saveDiscounts(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["admin", "finance"]);
  if (!s) return { error: "Only admins and finance can change discounts." };
  const pct = (v: FormDataEntryValue | null) => Math.min(100, Math.max(0, Number(v) || 0));
  for (const tier of ["free", "basic", "premium", "enterprise"]) {
    const { error } = await s.supabase.from("plan_discounts").upsert({
      tier, events_pct: pct(fd.get(`${tier}_events`)), services_pct: pct(fd.get(`${tier}_services`)),
      note: String(fd.get(`${tier}_note`) ?? "").trim().slice(0, 200) || null, updated_at: new Date().toISOString(),
    });
    if (error) return { error: "Couldn't save the discounts. Try again." };
  }
  revalidatePath("/admin/discounts");
  revalidatePath("/app/plans");
  return { ok: "Discounts saved." };
}

/** Create (or replace) an investor's private link. */
export async function makeInvestorLink(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const { data } = await s.supabase.from("investors").select("portal_token").eq("id", id.data).single();
  if (fd.get("reset") === "1" || !data?.portal_token) {
    const { randomBytes } = await import("node:crypto");
    await s.supabase.from("investors").update({ portal_token: randomBytes(24).toString("base64url") }).eq("id", id.data);
  }
  revalidatePath("/admin/investors");
}

export async function markInvestorInterestSeen(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  await s.supabase.from("investor_interest").update({ seen_by_staff: true }).eq("id", id.data);
  revalidatePath("/admin/investors");
}
