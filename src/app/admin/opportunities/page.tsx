import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Rss } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Badge, Card, CardHeader, Empty, Field, Input, PageHeader, Select, StatusBadge, Tabs, Textarea } from "@/components/ui";
import { cn, day, label } from "@/lib/format";
import {
  deleteOpportunity, importOpportunitiesNow, publishOpportunity, saveOpportunity, saveSource, setApplicationStatus, toggleSource,
} from "@/actions/admin";

export const metadata: Metadata = { title: "Opportunities" };

type Opp = {
  id: string; kind: string; title: string; summary: string; body: string; source: string | null; url: string | null; location: string | null;
  deadline: string | null; requires_verified: boolean; published: boolean; image_url: string | null; eligibility: string[]; benefits: string[];
  sectors: string[]; imported_at: string | null;
};
const KINDS = ["rfp", "tender", "grant", "event", "program"] as const;
const kindLabel = (k: string) => (k === "rfp" ? "RFP" : label(k));

function OppFields({ o }: { o?: Opp }) {
  return (
    <>
      {o ? <input type="hidden" name="id" value={o.id} /> : null}
      <div className="sm:col-span-2"><Field label="Title"><Input name="title" required defaultValue={o?.title} /></Field></div>
      <Field label="Kind"><Select name="kind" defaultValue={o?.kind ?? "rfp"}>{KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}</Select></Field>
      <Field label="Deadline"><Input name="deadline" type="date" defaultValue={o?.deadline ?? ""} /></Field>
      <Field label="Source"><Input name="source" placeholder="KenInvest, AfDB…" defaultValue={o?.source ?? ""} /></Field>
      <Field label="Location"><Input name="location" defaultValue={o?.location ?? ""} /></Field>
      <div className="sm:col-span-2"><Field label="Link to apply / the original"><Input name="url" type="url" defaultValue={o?.url ?? ""} /></Field></div>
      <div className="sm:col-span-2"><Field label="Poster image link" hint="https:// address of an image"><Input name="image_url" type="url" defaultValue={o?.image_url ?? ""} /></Field></div>
      <div className="sm:col-span-2"><Field label="Summary" hint="One or two lines"><Textarea name="summary" rows={2} maxLength={500} defaultValue={o?.summary} /></Field></div>
      <Field label="Who can apply" hint="One point per line"><Textarea name="eligibility" rows={4} defaultValue={o?.eligibility?.join("\n")} /></Field>
      <Field label="What you get" hint="One point per line"><Textarea name="benefits" rows={4} defaultValue={o?.benefits?.join("\n")} /></Field>
      <div className="sm:col-span-2"><Field label="Sectors" hint="Comma separated"><Input name="sectors" defaultValue={o?.sectors?.join(", ")} placeholder="Technology, Agriculture" /></Field></div>
      <div className="sm:col-span-2"><Field label="More details" hint="Optional, Markdown"><Textarea name="body" rows={4} defaultValue={o?.body} /></Field></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_verified" defaultChecked={o?.requires_verified ?? false} className="accent-navy-900" /> Verified companies only</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={o?.published ?? false} className="accent-navy-900" /> Published</label>
    </>
  );
}

function ReviewCard({ o }: { o: Opp }) {
  return (
    <article className="grid gap-4 rounded-[1.75rem] border border-line bg-white p-4 sm:grid-cols-[9rem_1fr]">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-sunken sm:aspect-auto sm:h-full">
        {o.image_url ? <img src={o.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-xs text-faint">No image</div>}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge tone="info">{kindLabel(o.kind)}</Badge>
          <span>{o.source}</span>
          <span>· {o.deadline ? `closes ${day(o.deadline)}` : "no deadline found"}</span>
          {o.location ? <span>· {o.location}</span> : null}
        </div>
        <p className="mt-2 font-semibold leading-snug">{o.title}</p>
        {o.summary ? <p className="mt-1 line-clamp-2 text-sm text-muted">{o.summary}</p> : null}
        <p className="mt-2 text-xs text-muted">{o.eligibility.length} eligibility point{o.eligibility.length === 1 ? "" : "s"} · {o.benefits.length} benefit{o.benefits.length === 1 ? "" : "s"}{o.sectors.length ? ` · ${o.sectors.join(", ")}` : ""}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form action={publishOpportunity}><input type="hidden" name="id" value={o.id} /><button className="rounded-full bg-navy-900 px-4 py-2 text-xs font-medium text-white hover:bg-navy-700">Publish</button></form>
          <Link href={`/admin/opportunities?id=${o.id}&tab=review`} className="rounded-full border border-line px-4 py-2 text-xs font-medium hover:bg-sunken">Edit first</Link>
          {o.url ? <a href={o.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs text-muted hover:text-ink">Original <ExternalLink className="size-3" /></a> : null}
          <form action={deleteOpportunity} className="ml-auto"><input type="hidden" name="id" value={o.id} /><button className="rounded-full px-3 py-2 text-xs text-muted hover:bg-bad/10 hover:text-bad">Skip</button></form>
        </div>
      </div>
    </article>
  );
}

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ id?: string; tab?: string }> }) {
  const s = await requireStaff();
  const { id, tab = "review" } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: all }, { data: sources }, { data: counts }] = await Promise.all([
    s.supabase.from("opportunities")
      .select("id, kind, title, summary, body, source, url, location, deadline, requires_verified, published, image_url, eligibility, benefits, sectors, imported_at")
      .is("dismissed_at", null).order("created_at", { ascending: false }).limit(300),
    s.supabase.from("opportunity_sources").select("*").order("created_at"),
    s.supabase.from("applications").select("opportunity_id").neq("status", "draft"),
  ]);
  const opps = (all ?? []) as Opp[];
  const review = opps.filter((o) => !o.published && o.imported_at && (!o.deadline || o.deadline >= today));
  const live = opps.filter((o) => o.published || !o.imported_at);
  const selected = opps.find((o) => o.id === id);
  const countOf = (oid: string) => (counts ?? []).filter((c) => c.opportunity_id === oid).length;
  const { data: apps } = selected
    ? await s.supabase.from("applications").select("id, status, note, staff_note, submitted_at, organizations(name)").eq("opportunity_id", selected.id).neq("status", "draft").order("submitted_at")
    : { data: null };

  return (
    <>
      <PageHeader title="Opportunities" sub="RFPs, tenders, grants, events and programmes for members. New ones are imported from your sources three times a day.">
        <ActionForm action={importOpportunitiesNow} submit="Import now" submitVariant="outline" className="flex items-center gap-3">{null}</ActionForm>
      </PageHeader>
      <Tabs current={`/admin/opportunities?tab=${tab}`} items={[
        { href: "/admin/opportunities?tab=review", label: `To review (${review.length})` },
        { href: "/admin/opportunities?tab=live", label: `Live and drafts (${live.length})` },
        { href: "/admin/opportunities?tab=sources", label: `Sources (${sources?.length ?? 0})` },
      ]} />

      {tab === "sources" ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader title="Where opportunities come from" sub="Only short facts are kept, always with a link back to the original." />
            <ul className="divide-y divide-line">
              {(sources ?? []).map((src) => (
                <li key={src.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium"><Rss className="size-4 text-muted" />{src.name}</p>
                    <p className="truncate text-xs text-muted">{src.url} · {src.kind === "grants_gov" ? "Grants.gov API" : src.kind === "wordpress" ? "WordPress API" : "RSS feed"}</p>
                    <p className={cn("mt-1 text-xs", src.last_error ? "text-bad" : "text-muted")}>
                      {src.last_run_at ? `Last run ${day(src.last_run_at)}: ${src.last_error ?? `${src.last_count ?? 0} new`}` : "Not run yet"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(["active", "auto_publish"] as const).map((f) => (
                      <form key={f} action={toggleSource}>
                        <input type="hidden" name="id" value={src.id} /><input type="hidden" name="field" value={f} /><input type="hidden" name="value" value={src[f] ? "0" : "1"} />
                        <button className={cn("rounded-full px-3 py-1.5 text-xs font-medium", src[f] ? "bg-mint-100 text-green" : "bg-sunken text-muted")}>
                          {f === "active" ? (src.active ? "On" : "Off") : src.auto_publish ? "Auto-publish" : "Review first"}
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="self-start">
            <CardHeader title="Add a source" />
            <ActionForm action={saveSource} submit="Add source">
              <Field label="Name"><Input name="name" required placeholder="Opportunities for Youth" /></Field>
              <Field label="Type">
                <Select name="kind" defaultValue="wordpress">
                  <option value="wordpress">Website (WordPress)</option>
                  <option value="rss">RSS feed</option>
                  <option value="grants_gov">Grants.gov search</option>
                </Select>
              </Field>
              <Field label="Address" hint="Website home page, feed URL, or https://api.grants.gov/?keyword=Africa"><Input name="url" type="url" required placeholder="https://" /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="auto_publish" className="accent-navy-900" /> Publish automatically (skip review)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_verified" className="accent-navy-900" /> Verified companies only</label>
            </ActionForm>
          </Card>
        </div>
      ) : tab === "review" && !selected ? (
        review.length ? <div className="grid gap-3 xl:grid-cols-2">{review.map((o) => <ReviewCard key={o.id} o={o} />)}</div>
          : <Empty title="Nothing to review" sub="Click Import now to check your sources, or wait for the next automatic import." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            {live.length ? (
              <ul className="divide-y divide-line">
                {live.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/opportunities?id=${o.id}&tab=live`} className={`-mx-3 flex items-center justify-between gap-4 rounded-2xl px-3 py-3 ${o.id === id ? "bg-sunken" : "hover:bg-sunken/60"}`}>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{o.title}</p>
                        <p className="text-xs text-muted">{kindLabel(o.kind)} · {o.deadline ? `closes ${day(o.deadline)}` : "no deadline"} · {countOf(o.id)} applications{o.source ? ` · ${o.source}` : ""}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {o.requires_verified ? <Badge tone="mint">Verified</Badge> : null}
                        <Badge tone={o.published ? "good" : "neutral"}>{o.published ? "Live" : "Draft"}</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <Empty title="No opportunities yet" sub="Post one, or publish from the review tab." />}
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title={selected ? "Edit opportunity" : "Post an opportunity"} action={selected ? <Link href={`/admin/opportunities?tab=${tab}`} className="text-sm text-muted">Close</Link> : undefined} />
              <ActionForm key={selected?.id ?? "new"} action={saveOpportunity} submit={selected ? "Save" : "Post"} className="grid gap-3 sm:grid-cols-2"><OppFields o={selected} /></ActionForm>
            </Card>
            {selected ? (
              <Card>
                <CardHeader title="Applications" sub={`${apps?.length ?? 0} submitted`} />
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
      )}
    </>
  );
}
