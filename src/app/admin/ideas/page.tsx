import type { Metadata } from "next";
import { Lightbulb, MessageSquare, ThumbsUp } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Drawer } from "@/components/drawer";
import { Empty, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { Avatar } from "@/components/profile-bits";
import { cn, day } from "@/lib/format";
import { addIdea, commentIdea, setIdeaStatus, voteIdea } from "@/actions/profiles";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Ideas" };
const STATUSES = [["new", "New"], ["discussing", "Discussing"], ["doing", "Doing it"], ["done", "Done"], ["parked", "Parked"]] as const;
const TONE: Record<string, string> = { new: "bg-navy-50 text-navy-700", discussing: "bg-amber-100 text-amber-700", doing: "bg-mint-100 text-green", done: "bg-green text-white", parked: "bg-sunken text-muted" };

export default async function Ideas({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const s = await requireStaff();
  const { show = "open" } = await searchParams;
  const [{ data: ideas }, { data: votes }, { data: comments }, { data: people }] = await Promise.all([
    s.supabase.from("ideas").select("*").order("created_at", { ascending: false }),
    s.supabase.from("idea_votes").select("idea_id, user_id"),
    s.supabase.from("idea_comments").select("*").order("created_at"),
    s.supabase.from("profiles").select("id, full_name").not("staff_role", "is", null),
  ]);
  const who = (id: string | null) => people?.find((p) => p.id === id)?.full_name ?? "Someone";
  type Vote = { idea_id: string; user_id: string };
  type Comment = { id: string; idea_id: string; author: string | null; body: string; created_at: string };
  const V = (votes ?? []) as Vote[], C = (comments ?? []) as Comment[];
  const list = (ideas ?? []).filter((i) => show === "all" || (show === "open" ? !["done", "parked"].includes(i.status) : i.status === show))
    .map((i) => ({ ...i, votes: V.filter((v) => v.idea_id === i.id), comments: C.filter((c) => c.idea_id === i.id) }))
    .sort((a, b) => b.votes.length - a.votes.length || b.created_at.localeCompare(a.created_at));

  return (
    <>
      <PageHeader title="Ideas" sub="Anyone can share an idea. The team says if it makes sense, and the best ones become projects.">
        <Drawer label="Share an idea" title="Share an idea" sub="Rough is fine. Say what and why.">
          <ActionForm action={addIdea} submit="Share" className="space-y-4">
            <Field label="Idea"><Input name="title" required placeholder="e.g. Monthly breakfast for new members" /></Field>
            <Field label="Why it could help"><Textarea name="details" rows={5} /></Field>
          </ActionForm>
        </Drawer>
      </PageHeader>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {[["open", "Open"], ...STATUSES, ["all", "All"]].map(([k, l]) => (
          <a key={k} href={`/admin/ideas?show=${k}`} className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium", show === k ? "bg-navy-900 text-white" : "bg-white/70 text-ink/70 hover:text-ink")}>{l}</a>
        ))}
      </div>
      {list.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((i) => {
            const mine = i.votes.some((v: Vote) => v.user_id === s.user.id);
            return (
              <article key={i.id} className="card flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <form action={voteIdea}>
                    <input type="hidden" name="id" value={i.id} />
                    <SubmitButton aria-label={mine ? "Remove my vote" : "This makes sense"} className={cn("flex w-14 flex-col items-center rounded-2xl py-2 transition", mine ? "bg-navy-900 text-white" : "bg-sunken text-ink/70 hover:bg-navy-50")}>
                      <ThumbsUp className="size-4" /><span className="num mt-0.5 text-sm font-semibold">{i.votes.length}</span>
                    </SubmitButton>
                  </form>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", TONE[i.status])}>{STATUSES.find(([k]) => k === i.status)?.[1]}</span></div>
                    <h2 className="mt-1.5 text-[15px] font-semibold text-navy-900">{i.title}</h2>
                    {i.details ? <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{i.details}</p> : null}
                    <p className="mt-2 text-xs text-muted">{who(i.author)} · {day(i.created_at)}{i.votes.length ? ` · liked by ${i.votes.map((v: Vote) => who(v.user_id).split(" ")[0]).join(", ")}` : ""}</p>
                  </div>
                </div>
                {i.comments.length ? (
                  <ul className="space-y-2 border-t border-line pt-3">
                    {i.comments.map((c: Comment) => (
                      <li key={c.id} className="flex gap-2.5 text-sm">
                        <Avatar name={who(c.author)} size="sm" round />
                        <div className="min-w-0 rounded-2xl bg-sunken/70 px-3 py-2"><p className="text-xs font-semibold">{who(c.author)}</p><p className="whitespace-pre-line">{c.body}</p></div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Drawer label={`Comment${i.comments.length ? ` (${i.comments.length})` : ""}`} title="Comment" sub={i.title} variant="outline" plus={false}>
                    <ActionForm action={commentIdea} submit="Add comment" className="space-y-3">
                      <input type="hidden" name="idea_id" value={i.id} />
                      <Field label="Does it make sense? What would make it work?"><Textarea name="body" rows={4} required /></Field>
                    </ActionForm>
                  </Drawer>
                  {s.staffRole === "admin" ? (
                    <form action={setIdeaStatus} className="ml-auto flex items-center gap-1">
                      <input type="hidden" name="id" value={i.id} />
                      <select name="status" defaultValue={i.status} aria-label="Status" className="rounded-full bg-sunken px-3 py-1.5 text-xs">{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                      <SubmitButton className="text-xs font-medium text-navy-600">Set</SubmitButton>
                    </form>
                  ) : <span className="ml-auto flex items-center gap-1 text-xs text-muted"><MessageSquare className="size-3.5" />{i.comments.length}</span>}
                </div>
              </article>
            );
          })}
        </div>
      ) : <Empty title="No ideas here yet" sub="Share the first one."><Lightbulb className="mx-auto size-6 text-amber" /></Empty>}
    </>
  );
}
