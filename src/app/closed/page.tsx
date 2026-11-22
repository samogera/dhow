import type { Metadata } from "next";
import { CenteredShell } from "@/components/centered-shell";

export const metadata: Metadata = { title: "Opening soon", robots: { index: false } };

export default function Closed() {
  return (
    <CenteredShell>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-navy-900">Opening soon</h1>
      <p className="mt-3 text-center text-muted">The member area isn&apos;t open yet. Membership round one is taking applications at dhowpartners.com/apply.</p>
      <div className="mt-6 flex flex-col gap-2 text-center text-sm">
        <a href="https://dhowpartners.com/apply" className="rounded-full bg-navy-900 px-5 py-3 font-medium text-white">Apply for membership</a>
        <a href="mailto:hello@dhowpartners.com" className="text-navy-600">hello@dhowpartners.com</a>
      </div>
    </CenteredShell>
  );
}
