import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ProfileForm } from "@/app/app/settings/forms";

export const metadata: Metadata = { title: "Your profile" };

export default async function StaffProfile() {
  const s = await requireStaff();
  return (
    <>
      <PageHeader title="Your profile" sub={`Signed in as ${s.user.email}`} />
      <Card className="max-w-2xl">
        <CardHeader title="Name, photo and phone" sub="Your photo shows in menus and on the team list." />
        <ProfileForm name={s.profile?.full_name ?? ""} phone={s.profile?.phone ?? ""} avatar={s.profile?.avatar_url} />
      </Card>
    </>
  );
}
