import type { Metadata } from "next";
import { isOrgAdmin, requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, CardHeader, PageHeader, Table } from "@/components/ui";
import { ConfirmSubmit } from "@/components/forms";
import { kes, label } from "@/lib/format";
import { PLAN_LABEL, PLAN_PRICE_KES } from "@/lib/types";
import { removeMember } from "@/actions/member";
import { CompanyForm, CompanyProfileForm, DeleteCompanyForm, InterestsForm, InviteForm, ListingForm } from "./forms";
import { SettingsTabs } from "@/components/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function Settings() {
  const m = await requireMember();
  const admin = isOrgAdmin(m.role);

  // Member names and emails come from the service role, scoped to this company only.
  const db = createAdminClient();
  const { data: rows } = await db.from("memberships").select("user_id, role").eq("org_id", m.org.id);
  const ids = (rows ?? []).map((r) => r.user_id as string);
  const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", ids);
  const team = await Promise.all(
    (rows ?? []).map(async (r) => {
      const { data } = await db.auth.admin.getUserById(r.user_id);
      return { id: r.user_id as string, role: r.role as string, email: data.user?.email ?? "", name: profiles?.find((p) => p.id === r.user_id)?.full_name ?? "" };
    }),
  );
  const { data: invites } = admin
    ? await db.from("invitations").select("id, email, role, expires_at").eq("org_id", m.org.id).is("accepted_at", null).gt("expires_at", new Date().toISOString())
    : { data: [] };

  return (
    <>
      <PageHeader title="Settings" sub={`${m.org.name} · your role: ${label(m.role)}`} />
      <SettingsTabs />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card id="interests" className="scroll-mt-24">
            <CardHeader title="What should we look for?" sub="We use this to put the best-fitting opportunities first and in your weekly email." />
            <InterestsForm org={m.org} disabled={!admin} />
          </Card>
          <Card id="directory" className="scroll-mt-24">
            <CardHeader title="Member directory" sub="You choose whether other members can find you." />
            <ListingForm org={m.org} disabled={!admin} />
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Company details" sub={m.org.verification_status === "verified" ? "Registration details are locked while you're verified." : "Registration details are only needed to get verified."} />
            <CompanyForm org={m.org} disabled={!admin} />
          </Card>
          <Card>
            <CardHeader title="Plan" />
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-semibold">{PLAN_LABEL[m.org.plan]}</p>
                <p className="text-sm text-muted">{PLAN_PRICE_KES[m.org.plan] ? `${kes(PLAN_PRICE_KES[m.org.plan])} per month` : "No monthly fee"}</p>
              </div>
              <a href="mailto:hello@dhowpartners.com?subject=Membership%20plan" className="text-sm font-medium text-navy-600">Change plan</a>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader title="Company profile" sub="Your logo, what you do, and where to find you. The Dhow team sees this on your company page." />
        <CompanyProfileForm org={m.org} disabled={!admin} />
      </Card>

      <Card className="mt-4">
        <CardHeader title="Team" sub="People who can see this company's workspace" />
        <Table head={["Name", "Email", "Role", ""]}>
          {team.map((t) => (
            <tr key={t.id}>
              <td className="font-medium">{t.name || "—"}{t.id === m.user.id ? <span className="ml-2 text-xs text-muted">(you)</span> : null}</td>
              <td className="text-muted">{t.email}</td>
              <td><Badge tone={t.role === "owner" ? "info" : "neutral"}>{label(t.role)}</Badge></td>
              <td className="text-right">
                {admin && t.id !== m.user.id && !(t.role === "owner" && m.role !== "owner") ? (
                  <form action={removeMember}>
                    <input type="hidden" name="user_id" value={t.id} />
                    <ConfirmSubmit variant="ghost" className="px-3 py-1.5 text-xs text-bad" message={`Remove ${t.email}?`}>Remove</ConfirmSubmit>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
          {(invites ?? []).map((i) => (
            <tr key={i.id}>
              <td className="text-muted">Invited</td>
              <td className="text-muted">{i.email}</td>
              <td><Badge tone="warn">{label(i.role)} · pending</Badge></td>
              <td />
            </tr>
          ))}
        </Table>
        {admin ? <div className="mt-6 border-t border-line pt-6"><InviteForm /></div> : null}
      </Card>

      {m.role === "owner" ? (
        <Card className="mt-4 border-bad/20 bg-bad/5">
          <CardHeader title="Delete company" sub="If you no longer want to be part of Dhow" />
          <DeleteCompanyForm name={m.org.name} />
        </Card>
      ) : null}

    </>
  );
}
