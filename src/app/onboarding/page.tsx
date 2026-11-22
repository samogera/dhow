import type { Metadata } from "next";
import { guardMemberSide, requireUser } from "@/lib/auth";
import { CenteredShell } from "@/components/centered-shell";
import { OnboardingForm } from "./form";

export const metadata: Metadata = { title: "Set up your company" };

export default async function Onboarding() {
  await guardMemberSide();
  const s = await requireUser();
  return (
    <CenteredShell wide logoHref="/app">
      <div>
        <p className="label">Step 1 of 1</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome{s.profile?.full_name ? `, ${s.profile.full_name.split(" ")[0]}` : ""}. Tell us about your company.
        </h1>
        <p className="mt-2 text-muted">You can change this later. Registration details are needed only for verification.</p>
        <OnboardingForm />
      </div>
    </CenteredShell>
  );
}
