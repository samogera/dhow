import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Drawer } from "@/components/drawer";
import { Card, Empty, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { saveInvestor } from "@/actions/investors";
import { INVESTOR_KIND } from "@/lib/investors";
import { cn } from "@/lib/format";

export const metadata: Metadata = { title: "Investors" };

type Inv = { id: string; name: string; kind: string; about: string | null; sectors: string[]; stages: string[]; ticket: string | null; countries: string | null; website: string | null; logo_url: string | null; active: boolean };

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
      <div className="sm:col-span-2"><Field label="What they look for"><Textarea name="about" rows={4} defaultValue={i?.about ?? ""} /></Field></div>
      <Field label="Logo" hint="PNG or JPG, up to 3 MB"><input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm text-muted" /></Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={i?.active ?? true} className="size-4 accent-navy-900" />Show to members</label>
    </ActionForm>
  );
}

export default async function Investors() {
  const s = await requireStaff();
  const { data } = await s.supabase.from("investors").select("*").order("name");
  const list = (data ?? []) as Inv[];
  return (
    <>
      <PageHeader title="Investors" sub="Vetted investors Premium and Enterprise members can ask to be introduced to.">
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
              <div className="mt-auto flex items-center justify-between">
                <span className="text-xs text-muted">{i.active ? "Shown to members" : "Hidden"}</span>
                <Drawer label="Edit" title={i.name} variant="outline" plus={false}><InvestorForm i={i} /></Drawer>
              </div>
            </Card>
          ))}
        </div>
      ) : <Empty title="No investors yet" sub="Add the funds, angels and lenders you can introduce members to." />}
    </>
  );
}
