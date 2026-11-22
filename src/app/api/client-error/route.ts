import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/error-log";

const Body = z.object({
  message: z.string().max(500),
  digest: z.string().max(80).optional(),
  path: z.string().max(300).optional(),
});

/** Errors from people's browsers, sent by the error pages. Limited so it can't be used to fill the table. */
export async function POST(req: Request) {
  if (!(await rateLimit("client-error", 20, 600))) return new NextResponse(null, { status: 204 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (p.success) await logError({ source: "browser", ...p.data });
  return new NextResponse(null, { status: 204 });
}
