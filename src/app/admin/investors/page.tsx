import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ActionForm, ConfirmSubmit } from "@/components/forms";
import { Drawer } from "@/components/drawer";
import { Card, Empty, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import Link from "next/link";
import { deleteInvestor, makeInvestorLink, markInvestorInterestSeen, saveInvestor } from "@/actions/investors";
import { CopyField } from "@/components/copy-field";
import { SubmitButton } from "@/components/submit-button";
import { appUrl } from "@/lib/app-url";
import { INVESTOR_KIND } from "@/lib/investors";
import { cn, day } from "@/lib/format";

export const metadata: Metadata = { title: "Investors" };

type Inv = { id: string; name: string; contact_name: string | null; email: string | null; deletion_requested_at: string | null; updated_by_investor_at: string | null; portal_token: string | null; kind: string; about: string | null; sectors: string[]; stages: string[]; ticket: string | null; countries: string | null; website: string | null; logo_url: string | null; active: boolean };

function InvestorForm({ i }: { i?: Inv }) {
  return (
    <ActionForm action={saveInvestor} submit={i ? "Save" : "Add investor"} className="grid gap-3 sm:grid-cols-2">
      {i ? <input type="hidden" name="id" value={i.id} /> : null}
      <div className="sm:col-span-2"><Field label="Name"><Input name="name" required defaultValue={i?.name} placeholder="e.g. Acumen East Africa" /></Field></div>
      <Field label="Type"><Select name="kind" defaultValue={i?.kind ?? "fund"}>{Object.entries(INVESTOR_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
      <Field label="Ticket size"><Input name="ticket" defaultValue={i?.ticket ?? ""} placeholder="USD 50k to 500k" /></Field>
      <Field label="Sectors" hint="Separate with commas"><Input name="sectors" defaultValue={i?.sectors.join(", ")} placeholder="Agriculture, Energy" /></Field>
      <Field label="Stages" hint="Separate with commas"><Input name="stages" defaultValue={i?.stages.join(", ")} placeholder="Early, Growth" /></Field>
      <Field label="Countries"><Input name="countries" defaultValue={i?.countries ?? ""} placeholder="Kenya, East Africa" /></Field>
      <Field label="Website"><Input name="website" type="url" defaultValue={i?.website ?? ""} placeholder="https://" /></Field>
      <Field label="Contact person" hint="Shown on their private page"><Input name="contact_name" defaultValue={i?.contact_name ?? ""} placeholder="e.g. Jane Mwangi" /></Field>
      <Field label="Email for alerts" hint="We email them when a company asks to meet them"><Input name="email" type="email" defaultValue={i?.email ?? ""} placeholder="jane@fund.com" /></Field>
      <div className="sm:col-span-2"><Field label="What they look for"><Textarea name="about" rows={4} defaultValue={i?.about ?? ""} /></Field></div>
      <Field label="Logo" hint="PNG or JPG, up to 3 MB"><input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm text-muted" /></Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={i?.active ?? true} className="size-4 accent-navy-900" />Show to members</label>
    </ActionForm>
  );
}

export default async function Investors() {
  const s = await requireStaff();
  const [{ data }, { data: interest }] = await Promise.all([
    s.supabase.from("investors").select("*").order("name"),
    s.supabase.from("investor_interest").select("id, investor_id, response, note, seen_by_staff, updated_at, organizations(id, name)").order("updated_at", { ascending: false }),
  ]);
  const list = (data ?? []) as Inv[];
  const answers = (interest ?? []) as unknown as { id: string; investor_id: string; response: string; note: string | null; seen_by_staff: boolean; updated_at: string; organizations: { id: string; name: string } | null }[];
  return (
    <>
      <PageHeader title="Investors" sub="Vetted investors. Members on Growth and Enterprise ask for introductions; each investor gets a private page to see companies and say who they want to meet.">
        <Drawer label="Add investor" title="Add an investor" sub="Members see the name, type, focus and ticket size. Introductions go through you.">
          <InvestorForm />
        </Drawer>
      </PageHeader>
      {list.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => (
            <Card key={i.id} className={cn("flex flex-col gap-3", !i.active && "opacity-60")}>
              <div className="flex items-center gap-3">
                {i.logo_url ? <img src={i.logo_url} alt="" className="size-11 rounded-xl bg-white object-contain ring-1 ring-line" /> : <span className="grid size-11 place-items-center rounded-xl bg-navy-50 font-semibold text-navy-700">{i.name[0]}</span>}
                <div className="min-w-0"><p className="truncate font-semibold">{i.name}</p><p className="text-xs text-muted">{INVESTOR_KIND[i.kind] ?? i.kind}{i.ticket ? ` · ${i.ticket}` : ""}</p></div>
              </div>
              {i.about ? <p className="line-clamp-3 text-sm text-ink/80">{i.about}</p> : null}
              {answers.filter((a) => a.investor_id === i.id).length ? (
                <ul className="space-y-1.5 rounded-xl bg-sunken/60 p-3 text-sm">
                  {answers.filter((a) => a.investor_id === i.id).slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className={cn("mr-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", a.response === "interested" ? "bg-green text-white" : "bg-white text-ink/60 ring-1 ring-line")}>{a.response === "interested" ? "Interested" : "Not now"}</span>
                        {a.organizations ? <Link href={`/admin/members/${a.organizations.id}`} className="font-medium hover:underline">{a.organizations.name}</Link> : "A company"}
                        {a.note ? <span className="block text-xs text-muted">&ldquo;{a.note}&rdquo;</span> : null}
                      </span>
                      {!a.seen_by_staff ? <form action={markInvestorInterestSeen}><input type="hidden" name="id" value={a.id} /><SubmitButton className="shrink-0 text-xs text-navy-600 underline">Seen</SubmitButton></form> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="space-y-2 rounded-xl border border-mint/40 bg-mint-100/40 p-3">
                <p className="text-xs font-semibold text-green">Private investor page</p>
                {i.portal_token ? (
                  <>
                    <CopyField value={`${appUrl()}/investor/${i.portal_token}`} share={`Hello${i.contact_name ? ` ${i.contact_name.split(" ")[0]}` : ""}, here are companies in Kenya we think you'd like to meet. Tap "I'm interested" and we'll introduce you:`} />
                    <div className="flex gap-4 text-xs">
                      <a href={`/investor/${i.portal_token}`} target="_blank" className="font-medium text-navy-600">Open it ↗</a>
                      <form action={makeInvestorLink}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="reset" value="1" /><SubmitButton className="text-muted underline">New link (old one stops working)</SubmitButton></form>
                    </div>
                  </>
                ) : (
                  <form action={makeInvestorLink}><input type="hidden" name="id" value={i.id} /><SubmitButton className="rounded-full bg-navy-900 px-4 py-2 text-xs font-medium text-white">Create their page</SubmitButton></form>
                )}
              </div>
              {i.deletion_requested_at ? (
                <p className="rounded-xl bg-bad/10 px-3 py-2 text-xs font-medium text-bad">Asked to be deleted on {day(i.deletion_requested_at)}. Delete within 30 days.</p>
              ) : i.updated_by_investor_at ? <p className="text-xs text-muted">They updated their profile on {day(i.updated_by_investor_at)}.</p> : null}
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{i.active ? "Shown to members" : "Hidden"}{i.email ? " · alerts on" : ""}</span>
                <div className="flex items-center gap-2">
                  <form action={deleteInvestor}>
                    <input type="hidden" name="id" value={i.id} />
                    <ConfirmSubmit variant="ghost" className="px-3 py-1.5 text-xs text-bad" message={`Delete ${i.name}? Their page, answers and introduction requests are removed for good.`}>Delete</ConfirmSubmit>
                  </form>
                  <Drawer label="Edit" title={i.name} variant="outline" plus={false}><InvestorForm i={i} /></Drawer>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : <Empty title="No investors yet" sub="Add the funds, angels and lenders you can introduce members to." />}
    </>
  );
}
