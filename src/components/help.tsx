import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Briefcase, FileText, LifeBuoy, Megaphone, Receipt, Search, ShieldCheck, Users } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/format";
import { type HelpArticle, sectionsOf } from "@/content/help";

const SECTION_ICON: Record<string, typeof BookOpen> = {
  "Getting started": LifeBuoy,
  Documents: FileText,
  Verification: BadgeCheck,
  Opportunities: Megaphone,
  "Account and security": ShieldCheck,
  Members: Users,
  "Clients and work": Briefcase,
  Finance: Receipt,
  Company: BookOpen,
};
const TONES = ["bg-mint-100 text-green", "bg-navy-50 text-navy-900", "bg-amber-100 text-amber-700"];

function match(a: HelpArticle, q: string) {
  const t = q.toLowerCase();
  return a.title.toLowerCase().includes(t) || a.summary.toLowerCase().includes(t) || a.body.toLowerCase().includes(t);
}

export function HelpIndex({ articles, base, q, title, sub, extra }: { articles: HelpArticle[]; base: string; q?: string; title: string; sub: string; extra?: React.ReactNode }) {
  const list = q ? articles.filter((a) => match(a, q)) : articles;
  const groups = sectionsOf(list);
  return (
    <div>
      <div className="max-w-2xl">
        <p className="label text-green">Help Centre</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">{title}</h1>
        <p className="mt-3 text-lg text-muted">{sub}</p>
        <form className="relative mt-8" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-faint" />
          <input name="q" defaultValue={q} placeholder="Search the guides, e.g. “M-Pesa” or “invite”" aria-label="Search the guides"
            className="w-full rounded-full border border-line bg-white py-4 pr-5 pl-14 text-base shadow-sm outline-none transition focus:border-navy-500" />
        </form>
        {q ? <p className="mt-4 text-sm text-muted">{list.length} result{list.length === 1 ? "" : "s"} for “{q}” · <Link href={base} className="text-navy-600 underline">Clear</Link></p> : null}
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g, i) => {
          const Icon = SECTION_ICON[g.section] ?? BookOpen;
          return (
            <section key={g.section} className="rounded-[1.75rem] border border-line bg-white p-6">
              <div className="flex items-center gap-3">
                <span className={cn("grid size-10 place-items-center rounded-2xl", TONES[i % 3])}><Icon className="size-5" /></span>
                <h2 className="font-semibold">{g.section}</h2>
              </div>
              <ul className="mt-4 space-y-1">
                {g.articles.map((a) => (
                  <li key={a.slug}>
                    <Link href={`${base}/${a.slug}`} className="group -mx-3 block rounded-2xl px-3 py-2.5 hover:bg-sunken">
                      <p className="flex items-center justify-between gap-2 text-sm font-medium">{a.title}<ArrowRight className="size-4 text-faint opacity-0 transition group-hover:opacity-100" /></p>
                      <p className="mt-0.5 text-xs text-muted">{a.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {!groups.length ? <p className="mt-10 text-muted">No guides match that search. Try a different word, or email hello@dhowpartners.com.</p> : null}
      {extra}
    </div>
  );
}

export function HelpArticleView({ article, articles, base }: { article: HelpArticle; articles: HelpArticle[]; base: string }) {
  const i = articles.findIndex((a) => a.slug === article.slug);
  const prev = articles[i - 1];
  const next = articles[i + 1];
  return (
    <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Guides" className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <Link href={base} className="flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All guides</Link>
          {sectionsOf(articles).map((g) => (
            <div key={g.section}>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-faint uppercase">{g.section}</p>
              <ul className="space-y-0.5">
                {g.articles.map((a) => (
                  <li key={a.slug}>
                    <Link href={`${base}/${a.slug}`} aria-current={a.slug === article.slug ? "page" : undefined}
                      className={cn("block rounded-xl px-3 py-1.5 text-sm", a.slug === article.slug ? "bg-navy-50 font-medium text-navy-900" : "text-ink/70 hover:bg-sunken hover:text-ink")}>
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <article className="min-w-0 max-w-3xl">
        <Link href={base} className="text-sm text-muted hover:text-ink lg:hidden">← All guides</Link>
        <p className="label mt-4 text-green lg:mt-0">{article.section}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{article.title}</h1>
        <p className="mt-3 text-lg text-muted">{article.summary}</p>
        <div className="mt-10 border-t border-line pt-8 text-[15px]"><Markdown source={article.body} /></div>

        <div className="mt-12 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
          {prev ? (
            <Link href={`${base}/${prev.slug}`} className="rounded-2xl border border-line p-4 hover:border-navy-300">
              <p className="text-xs text-muted">Previous</p><p className="mt-1 font-medium">{prev.title}</p>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`${base}/${next.slug}`} className="rounded-2xl border border-line p-4 text-right hover:border-navy-300">
              <p className="text-xs text-muted">Next</p><p className="mt-1 font-medium">{next.title}</p>
            </Link>
          ) : null}
        </div>
        <p className="mt-8 rounded-2xl bg-amber-100 px-5 py-4 text-sm text-ink/80">Still stuck? Email <a href="mailto:hello@dhowpartners.com" className="font-medium underline">hello@dhowpartners.com</a> and tell us what you were trying to do.</p>
      </article>
    </div>
  );
}
