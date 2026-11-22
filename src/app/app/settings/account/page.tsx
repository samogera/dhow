import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import { DeleteAccountForm, EmailChoicesForm, ProfileForm } from "../forms";

export const metadata: Metadata = { title: "You and your emails" };

export default async function Account() {
  const m = await requireMember();
  const { data: p } = await createAdminClient().from("profiles").select("email_prefs").eq("id", m.user.id).single();
  return (
    <>
      <PageHeader title="Settings" sub={`Signed in as ${m.user.email}`} />
      <SettingsTabs />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Emails we send you" sub={`To ${m.user.email}. Turn off anything you don't want.`} />
          <EmailChoicesForm prefs={(p?.email_prefs as Record<string, boolean>) ?? {}} />
        </Card>
        <Card>
          <CardHeader title="Your profile" sub="Add a phone number to get SMS for urgent updates" />
          <ProfileForm name={m.profile?.full_name ?? ""} phone={m.profile?.phone ?? ""} />
        </Card>
      </div>
      <Card className="mt-4 border-bad/20 bg-bad/5">
        <CardHeader title="Delete my account" sub="Remove your login and personal details from Dhow. Companies you alone own are deleted too." />
        <DeleteAccountForm />
      </Card>
    </>
  );
}
