import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Badge, Card, CardHeader, Empty, Field, Input, PageHeader, Select, StatusBadge, Textarea } from "@/components/ui";
import { day, label } from "@/lib/format";
import { saveOpportunity, setApplicationStatus } from "@/actions/admin";

export const metadata: Metadata = { title: "Opportunities" };

type Opp = { id: string; kind: string; title: string; summary: string; body: string; source: string | null; url: string | null; location: string | null; deadline: string | null; requires_verified: boolean; published: boolean };

function OppFields({ o }: { o?: Opp }) {
  return (
    <>
      {o ? <input type="hidden" name="id" value={o.id} /> : null}
      <div className="sm:col-span-2"><Field label="Title"><Input name="title" required defaultValue={o?.title} /></Field></div>
      <Field label="Kind"><Select name="kind" defaultValue={o?.kind ?? "rfp"}>{["rfp", "tender", "grant", "event", "program"].map((k) => <option key={k} value={k}>{k.toUpperCase() === "RFP" ? "RFP" : label(k)}</option>)}</Select></Field>
      <Field label="Deadline"><Input name="deadline" type="date" defaultValue={o?.deadline ?? ""} /></Field>
      <Field label="Source"><Input name="source" placeholder="KenInvest, AfDB…" defaultValue={o?.source ?? ""} /></Field>
      <Field label="Location"><Input name="location" defaultValue={o?.location ?? ""} /></Field>
      <div className="sm:col-span-2"><Field label="Link to the original"><Input name="url" type="url" defaultValue={o?.url ?? ""} /></Field></div>
      <div className="sm:col-span-2"><Field label="Summary" hint="One or two lines shown in the list"><Textarea name="summary" rows={2} maxLength={500} defaultValue={o?.summary} /></Field></div>
      <div className="sm:col-span-2"><Field label="Full details" hint="Markdown"><Textarea name="body" rows={6} defaultValue={o?.body} /></Field></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_verified" defaultChecked={o?.requires_verified ?? true} className="accent-navy-900" /> Verified companies only</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={o?.published ?? false} className="accent-navy-900" /> Published</label>
    </>
  );
}

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const s = await requireStaff();
  const { id } = await searchParams;
  const { data: opps } = await s.supabase.from("opportunities").select("id, kind, title, summary, body, source, url, location, deadline, requires_verified, published").order("created_at", { ascending: false });
  const selected = opps?.find((o) => o.id === id);
  const { data: apps } = selected
    ? await s.supabase.from("applications").select("id, status, note, staff_note, submitted_at, organizations(name, verification_status)").eq("opportunity_id", selected.id).neq("status", "draft").order("submitted_at")
    : { data: null };
  const { data: counts } = await s.supabase.from("applications").select("opportunity_id").neq("status", "draft");
  const countOf = (oid: string) => (counts ?? []).filter((c) => c.opportunity_id === oid).length;

  return (
    <>
      <PageHeader title="Opportunities" sub="RFPs, tenders, grants and events members can apply to." />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          {opps?.length ? (
            <ul className="divide-y divide-line">
              {opps.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/opportunities?id=${o.id}`} className={`-mx-3 flex items-center justify-between gap-4 rounded-2xl px-3 py-3 ${o.id === id ? "bg-sunken" : "hover:bg-sunken/60"}`}>
                    <div>
                      <p className="font-medium">{o.title}</p>
                      <p className="text-xs text-muted">{label(o.kind)} · {o.deadline ? `closes ${day(o.deadline)}` : "no deadline"} · {countOf(o.id)} applications</p>
                    </div>
                    <div className="flex gap-1">
                      {o.requires_verified ? <Badge tone="mint">Verified</Badge> : null}
                      <Badge tone={o.published ? "good" : "neutral"}>{o.published ? "Live" : "Draft"}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty title="No opportunities yet" sub="Post the first one using the form." />}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={selected ? "Edit opportunity" : "Post an opportunity"} action={selected ? <Link href="/admin/opportunities" className="text-sm text-muted">New</Link> : undefined} />
            <ActionForm key={selected?.id ?? "new"} action={saveOpportunity} submit={selected ? "Save" : "Post"} className="grid gap-3 sm:grid-cols-2"><OppFields o={selected} /></ActionForm>
          </Card>
          {selected ? (
            <Card>
              <CardHeader title="Applications" sub={`${apps?.length ?? 0} submitted`} />
              {apps?.length ? (
                <ul className="space-y-3">
                  {apps.map((a) => {
                    const org = a.organizations as unknown as { name: string; verification_status: string } | null;
                    return (
                      <li key={a.id} className="rounded-3xl bg-sunken p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div><p className="font-medium">{org?.name}</p><p className="text-xs text-muted">{a.submitted_at ? day(a.submitted_at) : ""}</p></div>
                          <StatusBadge status={a.status} />
                        </div>
                        {a.note ? <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{a.note}</p> : null}
                        <form action={setApplicationStatus} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                          <input type="hidden" name="id" value={a.id} />
                          <input name="staff_note" defaultValue={a.staff_note ?? ""} placeholder="Note to the company (optional)" className="field py-2 text-xs" />
                          <select name="status" defaultValue={a.status} className="rounded-full bg-white px-3 py-2 text-xs" aria-label="Status">{["submitted", "shortlisted", "won", "lost"].map((x) => <option key={x} value={x}>{label(x)}</option>)}</select>
                          <button className="rounded-full bg-navy-900 px-4 py-2 text-xs text-white">Update</button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-muted">No applications yet.</p>}
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
