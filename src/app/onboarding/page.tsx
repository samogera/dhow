import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardMemberSide, requireUser } from "@/lib/auth";
import { CenteredShell } from "@/components/centered-shell";
import { OnboardingForm } from "./form";

export const metadata: Metadata = { title: "Set up your company" };

export default async function Onboarding() {
  await guardMemberSide();
  const s = await requireUser();
  // Invited staff skip company setup and go straight to the staff workspace.
  if (s.profile?.staff_role) redirect("/admin");
  const first = s.profile?.full_name?.split(" ")[0];
  return (
    <CenteredShell logoHref="/app">
      <div>
        <div className="mb-5 flex items-center gap-2" aria-label="Step 2 of 2">
          <span className="h-1.5 flex-1 rounded-full bg-green" /><span className="h-1.5 flex-1 rounded-full bg-green" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{first ? `Welcome, ${first}.` : "Welcome."} What&apos;s your company called?</h1>
        <p className="mt-2 text-sm text-muted">That&apos;s all we need to set up your workspace. Registration details come later, only if you want to get verified.</p>
        <OnboardingForm />
      </div>
    </CenteredShell>
  );
}
