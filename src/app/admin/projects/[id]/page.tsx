import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Circle, Eye, MessageSquareText, Trash2, UserRound } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Drawer } from "@/components/drawer";
import { Badge, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { cn, day, kes } from "@/lib/format";
import { addTask, deleteTask, requestTaskReview, reviewTask, saveProject, setProjectStatus, setTaskStatus, toggleTask } from "@/actions/admin";

export const metadata: Metadata = { title: "Project" };
const STATUSES = ["todo", "in_progress", "review", "done"] as const;
const STATUS_LABEL: Record<string, string> = { todo: "To do", in_progress: "In progress", review: "In review", done: "Done" };

type Task = {
  id: string; title: string; status: string; priority: string; due_date: string | null; assignee: string | null; reviewer: string | null;
  notes: string | null; review_state: string | null; review_note: string | null; reviewed_by: string | null; reviewed_at: string | null; done_at: string | null;
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requireStaff();
  const [{ data: p }, { data: taskRows }, { data: staff }, { data: clients }] = await Promise.all([
    s.supabase.from("projects").select("*, clients(id, name)").eq("id", id).maybeSingle(),
    s.supabase.from("tasks").select("*").eq("project_id", id).order("status").order("due_date", { ascending: true, nullsFirst: false }),
    s.supabase.from("profiles").select("id, full_name").not("staff_role", "is", null).order("full_name"),
    s.supabase.from("clients").select("id, name").order("name"),
  ]);
  if (!p) notFound();
  const tasks = (taskRows ?? []) as Task[];
  const name = (uid: string | null) => (uid ? staff?.find((x) => x.id === uid)?.full_name ?? "Someone" : "Unassigned");
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const client = p.clients as { id: string; name: string } | null;
  const order = ["review", "in_progress", "todo", "done"];
  const sorted = [...tasks].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/projects" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />All projects</Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted">{client?.name ?? "Internal"}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{p.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              {p.start_date ? <span>Started {day(p.start_date)}</span> : null}
              {p.due_date ? <span className={cn(p.due_date < today && p.status !== "done" && "font-medium text-bad")}>Due {day(p.due_date)}</span> : null}
              {p.fee_kes ? <span className="num">Fee {kes(p.fee_kes)}</span> : null}
              <span className="capitalize">{p.priority} priority</span>
            </div>
          </div>
          <Drawer label="Edit project" title="Edit project" variant="outline" plus={false}>
            <ActionForm action={saveProject} submit="Save" className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={p.id} />
              <div className="sm:col-span-2"><Field label="Name"><Input name="name" required defaultValue={p.name} /></Field></div>
              <Field label="Client"><Select name="client_id" defaultValue={client?.id ?? ""}><option value="">Internal</option>{clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              <Field label="Fee (KES)"><Input name="fee_kes" type="number" min="0" step="any" defaultValue={p.fee_kes ?? ""} /></Field>
              <Field label="Start"><Input name="start_date" type="date" defaultValue={p.start_date ?? ""} /></Field>
              <Field label="Due"><Input name="due_date" type="date" defaultValue={p.due_date ?? ""} /></Field>
              <Field label="Status"><Select name="status" defaultValue={p.status}>{STATUSES.map((c) => <option key={c} value={c}>{STATUS_LABEL[c]}</option>)}</Select></Field>
              <Field label="Priority"><Select name="priority" defaultValue={p.priority}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></Field>
              <div className="sm:col-span-2"><Field label="Description"><Textarea name="description" rows={3} defaultValue={p.description ?? ""} /></Field></div>
            </ActionForm>
          </Drawer>
        </div>
        {p.description ? <p className="mt-4 max-w-3xl whitespace-pre-line text-sm text-ink/80">{p.description}</p> : null}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {STATUSES.map((st) => (
            <form key={st} action={setProjectStatus}>
              <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={st} />
              <button className={cn("rounded-full px-4 py-2 text-sm font-medium transition", p.status === st ? "bg-navy-900 text-white" : "bg-sunken text-ink/70 hover:text-ink")}>{STATUS_LABEL[st]}</button>
            </form>
          ))}
        </div>
        <div className="mt-6">
          <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted">{done} of {tasks.length} tasks done</span><span className="num font-semibold">{pct}%</span></div>
          <div className="h-2 rounded-full bg-sunken"><div className="h-full rounded-full bg-green transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
      </Card>

      <Card className="mt-4 p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Tasks</h2>
        <ActionForm action={addTask} submit="Add task" submitVariant="outline" className="grid gap-2 rounded-3xl bg-sunken/60 p-3 sm:grid-cols-[1fr_9.5rem_10rem_auto] sm:items-end">
          <input type="hidden" name="project_id" value={p.id} />
          <Field label="New task"><Input name="title" required placeholder="What needs doing?" /></Field>
          <Field label="Due"><Input name="due_date" type="date" /></Field>
          <Field label="Who"><Select name="assignee" defaultValue={s.user.id}>{staff?.map((x) => <option key={x.id} value={x.id}>{x.full_name ?? "Staff"}</option>)}</Select></Field>
        </ActionForm>

        {sorted.length ? (
          <ul className="mt-4 divide-y divide-line">
            {sorted.map((t) => {
              const isDone = t.status === "done";
              const late = t.due_date && t.due_date < today && !isDone;
              const canReview = t.status === "review" && t.assignee !== s.user.id && (!t.reviewer || t.reviewer === s.user.id || s.staffRole === "admin");
              return (
                <li key={t.id} className="py-4">
                  <div className="flex items-start gap-3">
                    <form action={toggleTask}>
                      <input type="hidden" name="id" value={t.id} /><input type="hidden" name="done" value={isDone ? "0" : "1"} />
                      <button aria-label={isDone ? "Mark not done" : "Mark done"} className="mt-0.5 text-navy-700 transition hover:scale-110">
                        {isDone ? <CheckCircle2 className="size-5 text-green" /> : <Circle className="size-5 text-faint" />}
                      </button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium", isDone && "text-muted line-through")}>{t.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span className="flex items-center gap-1"><UserRound className="size-3" />{name(t.assignee)}</span>
                        {t.due_date ? <span className={cn("flex items-center gap-1", late && "font-medium text-bad")}><CalendarDays className="size-3" />{day(t.due_date)}</span> : null}
                        {t.status === "review" ? <Badge tone="warn">Waiting for {name(t.reviewer)}</Badge> : null}
                        {t.review_state === "approved" ? <Badge tone="mint">Approved by {name(t.reviewed_by)}</Badge> : null}
                        {t.review_state === "changes" ? <Badge tone="bad">Changes asked by {name(t.reviewed_by)}</Badge> : null}
                      </div>
                      {t.review_note ? <p className="mt-2 flex gap-2 rounded-2xl bg-sunken/70 px-3 py-2 text-sm"><MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted" />{t.review_note}</p> : null}
                      {t.notes ? <p className="mt-2 whitespace-pre-line text-sm text-ink/75">{t.notes}</p> : null}

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {!isDone ? STATUSES.filter((st) => st !== "review" && st !== t.status).filter((st) => !(st === "done" && t.status === "review")).map((st) => (
                          <form key={st} action={setTaskStatus}>
                            <input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value={st} />
                            <button className="rounded-full bg-sunken px-3 py-1.5 text-xs font-medium text-ink/70 hover:text-ink">{st === "done" ? "Mark done" : STATUS_LABEL[st]}</button>
                          </form>
                        )) : null}
                        {!isDone && t.status !== "review" ? (
                          <Drawer label="Send for review" title="Send for review" sub="Someone else checks the work before it counts as done." variant="outline" plus={false}>
                            <ActionForm action={requestTaskReview} submit="Send for review" className="space-y-4">
                              <input type="hidden" name="id" value={t.id} />
                              <Field label="Who should review it?">
                                <Select name="reviewer" required defaultValue="">
                                  <option value="" disabled>Choose a colleague</option>
                                  {staff?.filter((x) => x.id !== t.assignee).map((x) => <option key={x.id} value={x.id}>{x.full_name ?? "Staff"}</option>)}
                                </Select>
                              </Field>
                            </ActionForm>
                          </Drawer>
                        ) : null}
                        {canReview ? (
                          <Drawer label="Review" title={`Review: ${t.title}`} sub={`Done by ${name(t.assignee)}`} plus={false}>
                            <div className="space-y-6">
                              <ActionForm action={reviewTask} submit="Approve, it's done" className="space-y-3">
                                <input type="hidden" name="id" value={t.id} /><input type="hidden" name="decision" value="approve" />
                                <Field label="Comment (optional)"><Textarea name="note" rows={2} /></Field>
                              </ActionForm>
                              <ActionForm action={reviewTask} submit="Send back" submitVariant="outline" className="space-y-3 border-t border-line pt-5">
                                <input type="hidden" name="id" value={t.id} /><input type="hidden" name="decision" value="changes" />
                                <Field label="What needs to change?"><Textarea name="note" rows={3} required /></Field>
                              </ActionForm>
                            </div>
                          </Drawer>
                        ) : t.status === "review" ? <span className="flex items-center gap-1 text-xs text-muted"><Eye className="size-3.5" />Only {name(t.reviewer)} can approve</span> : null}
                        {s.staffRole === "admin" ? (
                          <form action={deleteTask} className="ml-auto"><input type="hidden" name="id" value={t.id} />
                            <button aria-label="Delete task" className="grid size-8 place-items-center rounded-full text-faint hover:bg-bad/10 hover:text-bad"><Trash2 className="size-4" /></button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="mt-6 text-center text-sm text-muted">No tasks yet. Add the first one above.</p>}
      </Card>
    </div>
  );
}
