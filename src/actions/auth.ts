"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/components/forms";
import { appUrl } from "@/lib/app-url";

const app = () => appUrl()!;
const safePath = (p: unknown) => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : null);

const SignUp = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export async function signUp(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("signup", 5, 600))) return { error: "Too many attempts. Try again in 10 minutes." };
  const p = SignUp.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  // Per-email limit too, so bots rotating IPs can't flood one inbox with confirmation emails.
  if (!(await rateLimit(`signup-email:${p.data.email}`, 3, 3600))) return { ok: "Check your email for a link to confirm your account." };
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

const SignIn = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("signin", 10, 300))) return { error: "Too many attempts. Wait 5 minutes and try again." };
  const p = SignIn.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Enter your email and password." };
  if (!(await rateLimit(`signin-email:${p.data.email}`, 10, 900))) return { error: "Too many attempts for this account. Wait 15 minutes and try again." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(p.data);
  if (error || !data.user) return { error: "That email and password don't match." };

  const next = safePath(fd.get("next"));
  if (next) redirect(next);
  const { data: profile } = await supabase.from("profiles").select("staff_role").eq("id", data.user.id).single();
  redirect(profile?.staff_role ? "/admin" : "/app");
}

/** Passwordless sign-in: emails a one-time link. Same reply whether or not the account exists. */
export async function sendSignInLink(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  if (!email.success) return { error: "Enter your email address." };
  if (!(await rateLimit("signin-link", 10, 600)) || !(await rateLimit(`signin-link:${email.data}`, 3, 3600))) {
    return { error: "Too many links asked for. Wait a little, or sign in with your password." };
  }
  const next = safePath(fd.get("next")) ?? "/";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: false, emailRedirectTo: `${app()}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) {
    // No account with this email: say so plainly instead of pretending an email is on its way.
    if (error.code === "otp_disabled" || /signups not allowed|user not found/i.test(error.message)) {
      return { error: "There's no Dhow account with that email yet. Check the spelling, or create a free account below." };
    }
    if (error.status === 429 || /rate limit|security purposes/i.test(error.message)) return { error: "A link was sent a moment ago. Wait a minute, then try again." };
    return { error: "We couldn't send the link just now. Try again in a minute, or sign in with your password." };
  }
  return { ok: "Check your inbox for your sign-in link." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestReset(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("reset", 5, 600))) return { error: "Too many attempts. Try again later." };
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  if (!email.success) return { error: "Enter a valid email." };
  // At most 3 reset emails an hour to one address, whatever IP asks.
  if (!(await rateLimit(`reset-email:${email.data}`, 3, 3600))) return { ok: "If that email has an account, a reset link is on its way." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${app()}/auth/callback?next=/reset-password` });
  return { ok: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const pw = z.string().min(8, "Use at least 8 characters").max(128).safeParse(fd.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) return { error: error.message };
  redirect("/");
}

/** The 6-digit code from the email, typed or filled in by the phone, instead of clicking the link. */
const CodeIn = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().trim().regex(/^\d{6,8}$/, "Enter the code from the email"),
  kind: z.enum(["signup", "email", "recovery"]),
});
export async function verifyEmailCode(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = CodeIn.safeParse({ email: fd.get("email"), token: String(fd.get("token") ?? "").replace(/\s/g, ""), kind: fd.get("kind") });
  if (!p.success) return { error: p.error.issues[0].message };
  if (!(await rateLimit(`otp:${p.data.email}`, 8, 900))) return { error: "Too many tries. Wait 15 minutes, or use the link in the email." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: p.data.email, token: p.data.token, type: p.data.kind });
  if (error || !data.user) return { error: "That code didn't work. Check it, or ask for a new one." };
  if (p.data.kind === "signup") redirect("/onboarding");
  if (p.data.kind === "recovery") redirect("/reset-password");
  redirect(safePath(fd.get("next")) ?? "/");
}
