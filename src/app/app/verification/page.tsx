import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Check, Clock3, Zap } from "lucide-react";
import { isOrgAdmin, requireMember } from "@/lib/auth";
import { Card, CardHeader, PageHeader, StatusBadge, Table } from "@/components/ui";
import { day, kes, label } from "@/lib/format";
import { ManualRequest, PayAndVerify } from "./actions";

export const metadata: Metadata = { title: "Verification" };

export default async function Verification() {
  const { org, role, supabase, profile } = await requireMember();
  const { data: history } = await supabase
    .from("verifications")
    .select("id, tier, status, review_note, created_at, decided_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });
  const fee = Number(process.env.VERIFICATION_FEE_KES ?? 500);
  const verified = org.verification_status === "verified";
  const busy = org.verification_status === "pending";
  const canAct = isOrgAdmin(role) && !verified && !busy;

  return (
    <>
      <PageHeader title="Get Dhow Verified" sub="A badge that tells partners and buyers your company's records check out." />

      {verified ? (
        <div className="card mb-4 flex flex-wrap items-center gap-5 bg-mint-100">
          <span className="grid size-14 place-items-center rounded-2xl bg-green text-white"><BadgeCheck className="size-7" /></span>
          <div className="flex-1">
            <p className="text-xl font-semibold">{org.name} is Dhow Verified</p>
            <p className="text-sm text-muted">Checked {day(org.verified_at)} · valid until {day(org.verified_until)}</p>
          </div>
        </div>
      ) : null}

      {!org.brs_number && !verified ? (
        <p className="mb-4 rounded-2xl bg-warn/10 px-5 py-4 text-sm text-warn">
          Add your BRS registration number in <Link href="/app/settings" className="font-medium underline">Settings</Link> before you apply.
        </p>
      ) : null}

      {!verified ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-sunken"><Clock3 className="size-5" /></span>
              <div><p className="font-semibold">Free review</p><p className="text-sm text-muted">A Dhow reviewer checks your documents</p></div>
            </div>
            <ul className="my-6 space-y-2 text-sm">
              {["Upload your CR12 and KRA PIN certificate", "Reply within 3 working days", "No cost"].map((t) => <li key={t} className="flex gap-2"><Check className="size-4 text-good" />{t}</li>)}
            </ul>
            {canAct ? <ManualRequest /> : <p className="text-sm text-muted">{busy ? "Your request is in review." : "Only company owners and admins can apply."}</p>}
          </Card>
          <div className="card bg-mint">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-white/60"><Zap className="size-5" /></span>
              <div><p className="font-semibold">Instant by M-Pesa</p><p className="text-sm text-ink/70">Automatic check of your BRS records</p></div>
            </div>
            <p className="mt-6 text-4xl font-semibold tracking-tight">{kes(fee)}</p>
            <p className="mb-6 text-sm text-ink/70">One-off, valid for 12 months, plus 500 MB storage</p>
            {canAct ? <PayAndVerify defaultPhone={profile?.phone ?? ""} /> : <p className="text-sm text-ink/70">{busy ? "Your request is in progress." : "Only company owners and admins can pay."}</p>}
          </div>
        </div>
      ) : null}

      <Card className="mt-4">
        <CardHeader title="History" />
        {history?.length ? (
          <Table head={["Requested", "Route", "Status", "Decided", "Note"]}>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{day(h.created_at)}</td>
                <td className="text-muted">{h.tier === "instant" ? "Instant" : "Free review"}</td>
                <td><StatusBadge status={h.status} /></td>
                <td className="text-muted">{day(h.decided_at)}</td>
                <td className="max-w-xs text-muted">{h.review_note ?? ""}</td>
              </tr>
            ))}
          </Table>
        ) : <p className="text-sm text-muted">No requests yet.</p>}
        <p className="mt-6 text-xs text-faint">
          &ldquo;Dhow Verified&rdquo; means the company&apos;s registration records matched on the date checked. It is not a guarantee of performance. {label(org.verification_status)} status shown above.
        </p>
      </Card>
    </>
  );
}
