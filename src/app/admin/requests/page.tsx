import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Card, Empty, PageHeader, StatusBadge } from "@/components/ui";
import { setRequestStatus } from "@/actions/investors";
import { cn, day } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Member requests" };

const KIND: Record<string, string> = { member_intro: "Introduction to a member", investor_intro: "Introduction to an investor", event_representation: "Represent us at an event" };
const STATUS = ["new", "in_progress", "done", "declined"];

export default async function Requests({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "open" } = await searchParams;
  const s = await requireStaff();
  let q = s.supabase.from("member_requests").select("id, kind, target_id, target_name, note, status, staff_note, created_at, organizations(id, name)").order("created_at", { ascending: false }).limit(200);
  q = show === "open" ? q.in("status", ["new", "in_progress"]) : q.in("status", ["done", "declined"]);
  const { data } = await q;
  const rows = (data ?? []) as unknown as { id: string; kind: string; target_id: string; target_name: string | null; note: string | null; status: string; staff_note: string | null; created_at: string; organizations: { id: string; name: string } | null }[];
  return (
    <>
      <PageHeader title="Member requests" sub="Introductions and event representation members asked for." />
      <div className="mb-4 flex gap-1">
        {[["open", "Open"], ["closed", "Closed"]].map(([k, l]) => (
          <Link key={k} href={`/admin/requests?show=${k}`} className={cn("rounded-full px-4 py-2 text-sm", show === k ? "bg-navy-900 font-medium text-white" : "bg-white/70 text-ink/75 hover:bg-white")}>{l}</Link>
        ))}
      </div>
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">{KIND[r.kind] ?? r.kind} · {day(r.created_at)}</p>
                <p className="mt-1 font-semibold">
                  {r.organizations ? <Link href={`/admin/members/${r.organizations.id}`} className="hover:underline">{r.organizations.name}</Link> : "A member"}
                  <span className="font-normal text-muted"> → </span>
                  {r.kind === "event_representation" ? <Link href={`/admin/opportunities/${r.target_id}`} className="hover:underline">{r.target_name}</Link>
                    : r.kind === "member_intro" ? <Link href={`/admin/members/${r.target_id}`} className="hover:underline">{r.target_name}</Link> : r.target_name}
                </p>
                {r.note ? <p className="mt-2 rounded-xl bg-sunken/70 px-3 py-2 text-sm text-ink/80">{r.note}</p> : null}
              </div>
              <form action={setRequestStatus} className="space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <select name="status" defaultValue={r.status} aria-label="Status" className="flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
                    {STATUS.map((x) => <option key={x} value={x}>{x.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <input name="staff_note" defaultValue={r.staff_note ?? ""} placeholder="Note for the team" className="field py-1.5 text-sm" />
                <SubmitButton className="w-full rounded-lg bg-navy-900 px-3 py-1.5 text-sm font-medium text-white">Save</SubmitButton>
              </form>
            </Card>
          ))}
        </div>
      ) : <Empty title={show === "open" ? "No open requests" : "Nothing closed yet"} sub="When members ask for introductions or event representation, they show here." />}
    </>
  );
}
