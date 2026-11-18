import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl leading-tight font-semibold">Welcome<br />back</h1>
      <p className="mt-2 mb-6 text-sm text-muted">Sign in to your Dhow account.</p>
      {error === "link" ? <p className="mb-4 rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">That link has expired. Sign in or request a new one.</p> : null}
      <LoginForm next={next} />
      <div className="mt-6 flex justify-between text-xs text-muted">
        <Link href="/forgot-password" className="hover:text-ink">Forgot password?</Link>
        <span>No account? <Link href="/signup" className="font-medium text-ink">Sign up</Link></span>
      </div>
    </>
  );
}
