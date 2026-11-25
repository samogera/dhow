import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { notifyStaff } from "@/lib/notify";
import { appUrl } from "@/lib/app-url";

// Messages from the contact form on dhowpartners.com/contact. Each one becomes a lead.
// The website is public, so there is no key: only our own site may call it (CORS), each
// visitor is rate limited, and the form's hidden "website" field catches bots.

const ORIGINS = ["https://dhowpartners.com", "https://www.dhowpartners.com"];
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const s = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const Body = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(200)]).optional().transform((v) => v || null),
  phone: s(40),
  company: s(200),
  topics: z.array(z.string().trim().max(80)).max(15).default([]),
  question: s(2000),
  website: z.string().optional(),
}).refine((b) => b.email || (b.phone && b.phone.replace(/\D/g, "").length >= 7), { message: "Add an email or a phone number." });

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (origin && !ORIGINS.includes(origin)) return NextResponse.json({ error: "Not allowed" }, { status: 403, headers });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Check the form" }, { status: 400, headers });
  if (p.data.website) return NextResponse.json({ ok: true }, { headers }); // bot: pretend it worked
  if (!(await rateLimit("contact-form", 5, 3600))) return NextResponse.json({ error: "Too many messages. Please email hello@dhowpartners.com." }, { status: 429, headers });

  const v = p.data;
  const about = v.topics.filter((t) => t !== "Something else").join(", ");
  const nextStep = [about, v.question].filter(Boolean).join(": ").slice(0, 500) || "Question from the website";
  const db = createAdminClient();
  const { error } = await db.from("leads").insert({
    name: v.name, company: v.company, email: v.email, phone: v.phone, source: "Website contact form", next_step: nextStep,
  });
  if (error) return NextResponse.json({ error: "Couldn't save" }, { status: 500, headers });

  after(() => notifyStaff(["admin"], `New question from the website: ${v.name}`,
    [`${v.name}${v.company ? ` (${v.company})` : ""} asked about: ${v.topics.join(", ") || "-"}.`, ...(v.question ? [`"${v.question}"`] : []), `Reply to: ${v.email ?? v.phone}`, "It's in Leads."],
    { label: "Open leads", href: `${appUrl()}/admin/leads` }).catch(() => null));
  return NextResponse.json({ ok: true }, { headers });
}
