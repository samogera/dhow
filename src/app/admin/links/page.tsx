import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, CardHeader, Empty, Field, Input, PageHeader } from "@/components/ui";
import { deleteLink, saveLink } from "@/actions/admin";

export const metadata: Metadata = { title: "Links" };

export default async function Links() {
  const s = await requireStaff();
  const { data: links } = await s.supabase.from("links").select("id, title, url, category, notes").order("category").order("title");
  const cats = [...new Set((links ?? []).map((l) => l.category))];
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

  return (
    <>
      <PageHeader title="Links" sub="Every tool, portal and shared folder in one place." />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-4 md:grid-cols-2">
          {cats.length ? cats.map((c) => (
            <section key={c} className="card">
              <p className="label mb-3">{c}</p>
              <ul className="space-y-1">
                {links!.filter((l) => l.category === c).map((l) => (
                  <li key={l.id} className="group -mx-3 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 hover:bg-sunken">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0">
                      <p className="truncate font-medium">{l.title}</p>
                      <p className="truncate text-xs text-muted">{l.notes || host(l.url)}</p>
                    </a>
                    <form action={deleteLink} className="opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <input type="hidden" name="id" value={l.id} />
                      <button aria-label={`Remove ${l.title}`} className="grid size-7 place-items-center rounded-full text-muted hover:bg-white hover:text-bad">×</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )) : <div className="md:col-span-2"><Empty title="No links yet" /></div>}
        </div>
        <Card className="self-start">
          <CardHeader title="Add a link" />
          <ActionForm action={saveLink} submit="Add link">
            <Field label="Title"><Input name="title" required /></Field>
            <Field label="URL"><Input name="url" type="url" required placeholder="https://" /></Field>
            <Field label="Category">
              <Input name="category" required list="link-cats" defaultValue="Tools" />
              <datalist id="link-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Note"><Input name="notes" /></Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
