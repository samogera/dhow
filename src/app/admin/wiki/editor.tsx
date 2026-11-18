"use client";
import { useActionState, useState } from "react";
import { saveWikiPage } from "@/actions/admin";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Textarea } from "@/components/ui";

type Page = { id?: string; title: string; slug: string; section: string; body: string };
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export function WikiEditor({ page, sections }: { page?: Page; sections: string[] }) {
  const [state, act] = useActionState(saveWikiPage, undefined);
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [touched, setTouched] = useState(!!page);

  return (
    <form action={act} className="card space-y-4">
      {page?.id ? <input type="hidden" name="id" value={page.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Title"><Input name="title" required value={title} onChange={(e) => { setTitle(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} /></Field>
        <Field label="Section">
          <Input name="section" required list="wiki-sections" defaultValue={page?.section ?? "General"} />
          <datalist id="wiki-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Address"><Input name="slug" required pattern="[a-z0-9-]+" value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} /></Field>
      </div>
      <Field label="Content" hint="Markdown: # headings, - lists, **bold**, [links](https://…), - [ ] checklists">
        <Textarea name="body" rows={22} defaultValue={page?.body ?? ""} className="font-mono text-[13px] leading-relaxed" />
      </Field>
      <FormMessage state={state} />
      <div className="flex justify-end"><Submit>Save page</Submit></div>
    </form>
  );
}
