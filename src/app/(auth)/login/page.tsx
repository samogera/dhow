import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to your Dhow Partners account." };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-navy-900 sm:text-[1.75rem]">Welcome back</h1>
      <p className="mt-2 mb-7 text-center text-sm text-muted">Sign in to your Dhow account.</p>
      {error === "link" ? <p className="mb-4 rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">That link has expired or was already used. Sign in below, or ask for a new link.</p> : null}
      <LoginForm next={next} />
      <p className="mt-7 text-center text-sm text-muted">New to Dhow? <Link href="/signup" className="font-semibold text-navy-600 hover:text-navy-900">Create a free account</Link></p>
    </>
  );
}
