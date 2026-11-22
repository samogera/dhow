// Renders a legal document from plain data, so the wording stays easy to edit.
export type Block = string | { list: string[] } | { note: string };
export type Section = { id: string; title: string; body: Block[] };

export function LegalDoc({ title, updated, intro, sections }: { title: string; updated: string; intro: Block[]; sections: Section[] }) {
  return (
    <>
      <h1>{title}</h1>
      <p className="text-sm text-muted">Last updated {updated}</p>
      {intro.map((b, i) => <BlockView key={i} b={b} />)}
      <nav aria-label="Contents" className="not-prose my-8 rounded-3xl bg-sunken/60 p-5">
        <p className="label mb-2">Contents</p>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} className="text-navy-600 hover:underline">{i + 1}. {s.title}</a></li>)}
        </ol>
      </nav>
      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="scroll-mt-24">
          <h2>{i + 1}. {s.title}</h2>
          {s.body.map((b, j) => <BlockView key={j} b={b} />)}
        </section>
      ))}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  if (typeof b === "string") return <p>{b}</p>;
  if ("list" in b) return <ul>{b.list.map((x, i) => <li key={i}>{x}</li>)}</ul>;
  return <p className="rounded-2xl bg-mint-100/60 px-4 py-3 text-sm">{b.note}</p>;
}
