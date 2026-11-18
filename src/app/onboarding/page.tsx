import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "./form";

export const metadata: Metadata = { title: "Set up your company" };

export default async function Onboarding() {
  const s = await requireUser();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Logo href="/app" />
      <div className="card mt-8 p-8">
        <p className="label">Step 1 of 1</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Welcome{s.profile?.full_name ? `, ${s.profile.full_name.split(" ")[0]}` : ""}. Tell us about your company.
        </h1>
        <p className="mt-2 text-muted">You can change this later. Registration details are needed only for verification.</p>
        <OnboardingForm />
      </div>
    </div>
  );
}
