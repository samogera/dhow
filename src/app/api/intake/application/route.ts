import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/crypto";
import { applicationThanks } from "@/lib/member-emails";
import { notifyStaff } from "@/lib/notify";
import { appUrl } from "@/lib/app-url";

// Membership applications from dhowpartners.com/apply. The Google Apps Script that saves each
// application to the sheet also sends it here, with the shared MEMBERSHIP_INTAKE_KEY.

const t = (max: number) => z.union([z.string(), z.number(), z.boolean()]).optional().transform((v) => (v === undefined || v === null || v === "" ? null : String(v).trim().slice(0, max)));
const Body = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  role: t(120), phone: t(40), company: t(200), registered: t(80), sector: t(80), years: t(60), revenue: t(80),
  website: t(300), plan: t(60), heard: t(120), needs: t(3000), goals: t(3000),
  consent: z.any().optional().transform((v) => v === true || v === "true" || v === "on" || v === "Yes"),
  investors: z.any().optional().transform((v) => v === true || v === "true" || v === "on" || v === "Yes"),
});

/** Open this address in a browser to check the connection is switched on. It never shows the key. */
export async function GET() {
  return NextResponse.json({
    ready: Boolean(process.env.MEMBERSHIP_INTAKE_KEY),
    message: process.env.MEMBERSHIP_INTAKE_KEY ? "Ready. Applications from the website will arrive here." : "Not switched on: add MEMBERSHIP_INTAKE_KEY in Vercel, then redeploy.",
  });
}

export async function POST(req: Request) {
  const key = process.env.MEMBERSHIP_INTAKE_KEY;
  if (!key || !safeEqual(req.headers.get("x-intake-key") ?? "", key)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Missing name or email" }, { status: 400 });

  const db = createAdminClient();
  // The same person sending the form twice within a day updates one application.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: dupe } = await db.from("membership_applications").select("id").ilike("email", p.data.email).gte("created_at", since).limit(1).maybeSingle();
  const row = { ...p.data };
  const { data, error } = dupe
    ? await db.from("membership_applications").update(row).eq("id", dupe.id).select("id").single()
    : await db.from("membership_applications").insert(row).select("id").single();
  if (error || !data) return NextResponse.json({ error: "Could not save" }, { status: 500 });

  if (!dupe) {
    after(async () => {
      await applicationThanks(p.data.email, p.data.name).catch(() => null);
      await db.from("membership_applications").update({ thanks_sent_at: new Date().toISOString() }).eq("id", data.id);
      await notifyStaff(["admin"], `New membership application: ${p.data.company ?? p.data.name}`,
        [`${p.data.name}${p.data.role ? `, ${p.data.role}` : ""} at ${p.data.company ?? "-"} applied for ${p.data.plan ?? "membership"}.`],
        { label: "Review applications", href: `${appUrl()}/admin/applications` }).catch(() => null);
    });
  }
  return NextResponse.json({ ok: true });
}
