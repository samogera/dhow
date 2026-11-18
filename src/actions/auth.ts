"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/components/forms";

const app = () => process.env.NEXT_PUBLIC_APP_URL!;
const safePath = (p: unknown) => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : null);

const SignUp = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(10, "Use at least 10 characters").max(128),
});

export async function signUp(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("signup", 5, 600))) return { error: "Too many attempts. Try again in 10 minutes." };
  const p = SignUp.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: p.data.email,
    password: p.data.password,
    options: { data: { full_name: p.data.full_name }, emailRedirectTo: `${app()}/auth/callback?next=/onboarding` },
  });
  // Same message whether or not the email exists, so accounts can't be discovered.
  if (error && !/registered/i.test(error.message)) return { error: error.message };
  return { ok: "Check your email for a link to confirm your account." };
}

const SignIn = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("signin", 10, 300))) return { error: "Too many attempts. Wait 5 minutes and try again." };
  const p = SignIn.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(p.data);
  if (error || !data.user) return { error: "That email and password don't match." };

  const next = safePath(fd.get("next"));
  if (next) redirect(next);
  const { data: profile } = await supabase.from("profiles").select("staff_role").eq("id", data.user.id).single();
  redirect(profile?.staff_role ? "/admin" : "/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestReset(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("reset", 5, 600))) return { error: "Too many attempts. Try again later." };
  const email = z.string().trim().email().safeParse(fd.get("email"));
  if (!email.success) return { error: "Enter a valid email." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${app()}/auth/callback?next=/reset-password` });
  return { ok: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const pw = z.string().min(10, "Use at least 10 characters").max(128).safeParse(fd.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) return { error: error.message };
  redirect("/app");
}
