import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { ButtonLink, Card, Empty, PageHeader, StatusBadge, Table } from "@/components/ui";
import { cn, day } from "@/lib/format";
import { RemoveApplication, StageSelect } from "./stage";

export const metadata: Metadata = { title: "My applications" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "interested", label: "Interested" },
  { key: "started", label: "Started" },
  { key: "submitted", label: "Submitted" },
  { key: "result", label: "Results" },
];
const EDITABLE = ["interested", "draft", "started", "submitted"];

export default async function Applications({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "all" } = await searchParams;
  const { org, supabase } = await requireMember();
  const { data } = await supabase
    .from("applications")
    .select("id, status, note, submitted_at, opportunities(id, title, deadline)")
    .eq("org_id", org.id)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: false });
  const all = (data ?? []) as unknown as { id: string; status: string; note: string | null; submitted_at: string | null; opportunities: { id: string; title: string; deadline: string | null } }[];
  const stageOf = (s: string) => (s === "draft" ? "interested" : ["shortlisted", "won", "lost"].includes(s) ? "result" : s);
  const count = (k: string) => (k === "all" ? all.length : all.filter((a) => stageOf(a.status) === k).length);
  const apps = show === "all" ? all : all.filter((a) => stageOf(a.status) === show);

  return (
    <>
      <PageHeader title="My applications" sub="Everything you're interested in, working on or have sent.">
        <ButtonLink href="/app/opportunities" variant="outline">Browse opportunities</ButtonLink>
      </PageHeader>
      <nav aria-label="Filter" className="no-scrollbar -mx-4 mb-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <Link key={f.key} href={f.key === "all" ? "/app/applications" : `/app/applications?show=${f.key}`} aria-current={show === f.key ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition", show === f.key ? "bg-navy-900 font-medium text-white" : "bg-white/70 text-ink/75 hover:bg-white")}>
            {f.label}<span className={cn("text-xs", show === f.key ? "text-white/70" : "text-faint")}>{count(f.key)}</span>
          </Link>
        ))}
      </nav>
      {apps.length ? (
        <ul className="space-y-3 sm:hidden">
          {apps.map((a) => (
            <li key={a.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <Link href={`/app/opportunities/${a.opportunities.id}`} className="line-clamp-2 font-medium text-navy-900">{a.opportunities.title}</Link>
              <p className="mt-1 text-xs text-muted">Added {day(a.submitted_at)}{a.opportunities.deadline ? ` · closes ${day(a.opportunities.deadline)}` : ""}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                {EDITABLE.includes(a.status) ? <StageSelect id={a.id} status={a.status === "draft" ? "interested" : a.status} /> : <StatusBadge status={a.status} />}
                {EDITABLE.includes(a.status) ? (
                  <RemoveApplication id={a.id} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <Card className={apps.length ? "hidden sm:block" : ""}>
        {apps.length ? (
          <Table head={["Opportunity", "Added", "Closes", "Stage", ""]}>
            {apps.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/app/opportunities/${a.opportunities.id}`} className="font-medium hover:underline">{a.opportunities.title}</Link></td>
                <td className="text-muted">{day(a.submitted_at)}</td>
                <td className="text-muted">{day(a.opportunities.deadline)}</td>
                <td>{EDITABLE.includes(a.status) ? <StageSelect id={a.id} status={a.status === "draft" ? "interested" : a.status} /> : <StatusBadge status={a.status} />}</td>
                <td className="text-right">
                  {EDITABLE.includes(a.status) ? (
                    <RemoveApplication id={a.id} />
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        ) : <Empty title={show === "all" ? "Nothing here yet" : "Nothing in this list"} sub="Open any opportunity and add it as Interested, Started or Submitted." />}
      </Card>
    </>
  );
}
