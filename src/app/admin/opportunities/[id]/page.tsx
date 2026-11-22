import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, CardHeader, Field, Input, Select, StatusBadge, Textarea } from "@/components/ui";
import { OpportunityCard, type CardOpp } from "@/components/opportunity-card";
import { day, label } from "@/lib/format";
import { OPP_KINDS, defaultWhy, kindLabel } from "@/lib/opportunity-display";
import { saveOpportunity, setApplicationStatus } from "@/actions/admin";

export const metadata: Metadata = { title: "Edit opportunity" };

type Opp = CardOpp & {
  body: string; about: string; dhow_note: string; eligibility: string[]; sectors: string[]; venue: string | null; members_only?: boolean;
};

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line pt-6 first-of-type:border-0 first-of-type:pt-0 lg:grid-cols-[14rem_1fr]">
      <div><h2 className="font-semibold text-navy-900">{title}</h2>{sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
const Wide = ({ children }: { children: ReactNode }) => <div className="sm:col-span-2">{children}</div>;

export default async function EditOpportunity({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requireStaff();
  const { kind: kindParam } = await searchParams;
  const { data } = isNew ? { data: null } : await s.supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (!isNew && !data) notFound();
  const o = data as Opp | null;
  const kind = o?.kind ?? ((OPP_KINDS as readonly string[]).includes(kindParam ?? "") ? kindParam! : "grant");
  const { data: apps } = o
    ? await s.supabase.from("applications").select("id, status, note, staff_note, submitted_at, organizations(name)").eq("opportunity_id", o.id).neq("status", "draft").order("submitted_at")
    : { data: null };
  const imported = Boolean(o?.imported_at);

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/admin/opportunities?tab=live" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />All opportunities</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{isNew ? (kind === "event" ? "Add an event" : "Post an opportunity") : "Edit opportunity"}</h1>
          <p className="mt-1 text-sm text-muted">{imported ? `Imported from ${o?.source}. Check the facts and the application link before publishing.` : "Added by the Dhow team. Members see “Added by the Dhow team”."}</p>
        </div>
        {o ? <Link href={`/app/opportunities/${o.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600">See the member page <ExternalLink className="size-4" /></Link> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card className="p-5 sm:p-8">
          <ActionForm key={o?.id ?? "new"} action={saveOpportunity} submit={isNew ? "Post" : "Save changes"} className="space-y-8">
            {o ? <input type="hidden" name="id" value={o.id} /> : null}
            <Section title="Basics" sub="The title shows as written. Long titles are split into a headline and “For …” line automatically.">
              <Wide><Field label="Title"><Input name="title" required defaultValue={o?.title} /></Field></Wide>
              <Field label="Kind"><Select name="kind" defaultValue={kind}>{OPP_KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}</Select></Field>
              <Field label="Application deadline"><Input name="deadline" type="date" defaultValue={o?.deadline ?? ""} /></Field>
              <Field label="Location"><Input name="location" placeholder="Kenya, Africa, Global…" defaultValue={o?.location ?? ""} /></Field>
              <Field label="Sectors" hint="Comma separated"><Input name="sectors" defaultValue={o?.sectors?.join(", ")} placeholder="Technology, Agriculture" /></Field>
              <Wide><Field label="Poster image" hint="https:// link to the image. Imported posts use the organiser's own poster."><Input name="image_url" type="url" defaultValue={o?.image_url ?? ""} /></Field></Wide>
            </Section>

            <Section title="Event details" sub="Only for events. They also appear in the members' Events section.">
              <Field label="Starts"><Input name="starts_on" type="date" defaultValue={o?.starts_on ?? ""} /></Field>
              <Field label="Ends"><Input name="ends_on" type="date" defaultValue={o?.ends_on ?? ""} /></Field>
              <Wide><Field label="Venue"><Input name="venue" placeholder="KICC, Nairobi · or Online" defaultValue={o?.venue ?? ""} /></Field></Wide>
            </Section>

            <Section title="The page" sub="What members read on the full page.">
              <Wide><Field label="Summary" hint="One or two lines, shown on the card and at the top"><Textarea name="summary" rows={2} maxLength={500} defaultValue={o?.summary} /></Field></Wide>
              <Wide><Field label="About" hint="A short description in plain words"><Textarea name="about" rows={5} maxLength={3000} defaultValue={o?.about?.trim()} /></Field></Wide>
              <Field label="Who can apply" hint="One point per line"><Textarea name="eligibility" rows={5} defaultValue={o?.eligibility?.join("\n")} /></Field>
              <Field label="What you get" hint="One point per line"><Textarea name="benefits" rows={5} defaultValue={o?.benefits?.join("\n")} /></Field>
              <Wide><Field label="Why it matters" hint={`Your note to members. If empty: “${defaultWhy(kind, []).slice(0, 80)}…”`}><Textarea name="dhow_note" rows={2} maxLength={600} defaultValue={o?.dhow_note} /></Field></Wide>
              <Wide><Field label="More details" hint="Optional, Markdown"><Textarea name="body" rows={4} defaultValue={o?.body} /></Field></Wide>
            </Section>

            <Section title="Links and credit" sub="Members apply on the organiser's own page. The source is credited at the bottom of the page.">
              <Wide><Field label="Official application link" hint="The organiser's page (UN, foundation, programme site), not the site we found it on"><Input name="apply_url" type="url" placeholder="https://" defaultValue={o?.apply_url ?? (imported ? "" : o?.url ?? "")} /></Field></Wide>
              <Field label="Found on" hint="Leave empty if the Dhow team added it"><Input name="source" placeholder="KenInvest, Opportunity Desk…" defaultValue={o?.source === "Dhow Partners" ? "" : o?.source ?? ""} /></Field>
              <Field label="Link to where we found it"><Input name="url" type="url" placeholder="https://" defaultValue={imported ? o?.url ?? "" : ""} /></Field>
            </Section>

            <Section title="Visibility">
              <Wide>
                <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={o?.published ?? true} className="size-4 accent-navy-900" />Published</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={o?.featured ?? false} className="size-4 accent-navy-900" />Recommended by Dhow</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="requires_verified" defaultChecked={o?.requires_verified ?? false} className="size-4 accent-navy-900" />Verified companies only</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="members_only" defaultChecked={o?.members_only ?? false} className="size-4 accent-navy-900" />Paying members only (Basic and up)</label>
                </div>
              </Wide>
            </Section>
          </ActionForm>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          {o ? (
            <div>
              <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">Card preview</p>
              <OpportunityCard o={o} href={`/app/opportunities/${o.id}`} />
            </div>
          ) : null}
          {o ? (
            <Card>
              <CardHeader title="Applications" sub={`${apps?.length ?? 0} tracked`} />
              {apps?.length ? (
                <ul className="space-y-3">
                  {apps.map((a) => {
                    const org = a.organizations as unknown as { name: string } | null;
                    return (
                      <li key={a.id} className="rounded-3xl bg-sunken p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div><p className="font-medium">{org?.name}</p><p className="text-xs text-muted">{a.submitted_at ? day(a.submitted_at) : ""}</p></div>
                          <StatusBadge status={a.status} />
                        </div>
                        {a.note ? <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{a.note}</p> : null}
                        <form action={setApplicationStatus} className="mt-3 grid gap-2">
                          <input type="hidden" name="id" value={a.id} />
                          <input name="staff_note" defaultValue={a.staff_note ?? ""} placeholder="Note to the company (optional)" className="field py-2 text-xs" />
                          <div className="flex gap-2">
                            <select name="status" defaultValue={a.status} className="flex-1 rounded-full bg-white px-3 py-2 text-xs" aria-label="Status">{["submitted", "shortlisted", "won", "lost"].map((x) => <option key={x} value={x}>{label(x)}</option>)}</select>
                            <button className="rounded-full bg-navy-900 px-4 py-2 text-xs text-white">Update</button>
                          </div>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-muted">No member has tracked this yet.</p>}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
