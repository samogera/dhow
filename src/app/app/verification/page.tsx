import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Check, CreditCard, FileUp, ShieldCheck, Zap } from "lucide-react";
import { isOrgAdmin, requireMember } from "@/lib/auth";
import { Card, CardHeader, PageHeader, StatusBadge, Table } from "@/components/ui";
import { day, kes, label } from "@/lib/format";
import { PayAndVerify, PaystackCheckout } from "./actions";
import { paymentProvider } from "@/lib/paystack";
import { confirmPaystack } from "@/lib/payments";

export const metadata: Metadata = { title: "Verification" };

export default async function Verification({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  // Coming back from Paystack checkout: confirm the payment with Paystack before reading the page.
  const paid = reference ? await confirmPaystack(reference).catch(() => null) : null;
  const { org, role, supabase, profile } = await requireMember();
  const provider = paymentProvider();
  const { data: history } = await supabase
    .from("verifications")
    .select("id, tier, status, review_note, created_at, decided_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });
  const { data: docs } = await supabase.from("documents").select("kind")
    .eq("org_id", org.id).in("status", ["uploaded", "approved"]);
  const kinds = new Set((docs ?? []).map((d) => d.kind));
  const uploaded = (kinds.has("cr12") || kinds.has("certificate_of_incorporation")) && kinds.has("kra_pin");
  const fee = Number(process.env.VERIFICATION_FEE_KES ?? 500);
  const verified = org.verification_status === "verified";
  const busy = org.verification_status === "pending";
  const canAct = isOrgAdmin(role) && !verified && !busy && uploaded;

  return (
    <>
      <PageHeader title="Get Dhow Verified" sub="A badge that tells partners and buyers your company's records check out." />

      {paid ? (
        <p className={`mb-4 rounded-2xl px-5 py-4 text-sm ${paid.state === "paid" ? "bg-good/10 text-good" : paid.state === "failed" ? "bg-bad/10 text-bad" : "bg-warn/10 text-warn"}`}>
          {paid.message}{paid.receipt ? ` Reference ${paid.receipt}.` : ""}
        </p>
      ) : null}

      {verified ? (
        <div className="card mb-4 flex flex-wrap items-center gap-5 bg-mint-100">
          <span className="grid size-14 place-items-center rounded-2xl bg-green text-white"><BadgeCheck className="size-7" /></span>
          <div className="flex-1">
            <p className="text-xl font-semibold">{org.name} is Dhow Verified</p>
            <p className="text-sm text-muted">Checked {day(org.verified_at)} · valid until {day(org.verified_until)}</p>
          </div>
        </div>
      ) : null}

      {!verified ? (
        <ol className="mb-6 grid gap-3 md:grid-cols-3">
          <li className={`card flex gap-4 ${uploaded ? "bg-mint-100/60" : ""}`}>
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${uploaded ? "bg-green text-white" : "bg-navy-900 text-white"}`}>{uploaded ? <Check className="size-5" /> : <FileUp className="size-5" />}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Step 1</p>
              <p className="mt-0.5 font-semibold">Upload your documents</p>
              <p className="mt-1 text-sm text-muted">CR12 or certificate of incorporation, and KRA PIN certificate.</p>
              {uploaded ? <p className="mt-2 text-sm font-medium text-green">Documents uploaded</p> : <Link href="/app/documents" className="mt-2 inline-block text-sm font-medium text-navy-600">Go to Documents →</Link>}
            </div>
          </li>
          <li className={`card flex gap-4 ${busy ? "bg-mint-100/60" : ""}`}>
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${busy ? "bg-green text-white" : uploaded ? "bg-navy-900 text-white" : "bg-sunken text-muted"}`}>{busy ? <Check className="size-5" /> : <CreditCard className="size-5" />}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Step 2</p>
              <p className="mt-0.5 font-semibold">Pay the fee</p>
              <p className="mt-1 text-sm text-muted">{kes(fee)} by M-Pesa{provider === "paystack" ? " or card" : ""}. One-off, valid for 12 months.</p>
              {busy ? <p className="mt-2 text-sm font-medium text-green">Paid</p> : null}
            </div>
          </li>
          <li className={`card flex gap-4 ${busy ? "bg-amber-100/60" : ""}`}>
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${busy ? "bg-navy-900 text-white" : "bg-sunken text-muted"}`}><ShieldCheck className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Step 3</p>
              <p className="mt-0.5 font-semibold">KYB check</p>
              <p className="mt-1 text-sm text-muted">Starts as soon as you pay. We check your company against the official business registry. If anything needs a closer look, the Dhow team contacts you.</p>
              {busy ? <p className="mt-2 text-sm font-medium text-amber-700">In progress</p> : null}
            </div>
          </li>
        </ol>
      ) : null}

      {!org.brs_number && !verified ? (
        <p className="mb-4 rounded-2xl bg-warn/10 px-5 py-4 text-sm text-warn">
          Add your BRS registration number in <Link href="/app/settings" className="font-medium underline">Settings</Link> before you apply.
        </p>
      ) : null}

      {!verified ? (
        <div className="card max-w-xl bg-mint">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-white/60"><Zap className="size-5" /></span>
            <div><p className="font-semibold">Get verified</p><p className="text-sm text-ink/70">Pay once and the registry check starts straight away</p></div>
          </div>
          <p className="mt-6 text-4xl font-semibold tracking-tight">{kes(fee)}</p>
          <p className="mb-6 text-sm text-ink/70">One-off, valid for 12 months, plus 500 MB storage</p>
          {canAct ? (provider === "paystack" ? <PaystackCheckout fee={fee} /> : <PayAndVerify defaultPhone={profile?.phone ?? ""} />) : (
            <p className="text-sm text-ink/70">{busy ? "Your check is in progress." : !isOrgAdmin(role) ? "Only company owners and admins can pay." : "Finish step 1 first: upload your documents."}</p>
          )}
        </div>
      ) : null}

      <Card className="mt-4">
        <CardHeader title="History" />
        {history?.length ? (
          <Table head={["Requested", "Status", "Decided", "Note"]}>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{day(h.created_at)}</td>
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
