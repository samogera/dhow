import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Drawer } from "@/components/drawer";
import { Badge, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { day, kes, label } from "@/lib/format";
import { addTask, saveProject, setProjectStatus, toggleTask } from "@/actions/admin";

export const metadata: Metadata = { title: "Projects" };
const COLS = ["todo", "in_progress", "review", "done"] as const;
const PRI = { high: "bad", medium: "warn", low: "neutral" } as const;

export default async function Projects() {
  const s = await requireStaff();
  const [{ data: projects }, { data: tasks }, { data: clients }] = await Promise.all([
    s.supabase.from("projects").select("id, name, status, priority, due_date, fee_kes, clients(name)").order("due_date", { ascending: true, nullsFirst: false }),
    s.supabase.from("tasks").select("id, title, status, priority, due_date, project_id, reviewer, assignee").order("due_date", { ascending: true, nullsFirst: false }).limit(500),
    s.supabase.from("clients").select("id, name").order("name"),
  ]);
  const { data: staff } = await s.supabase.from("profiles").select("id, full_name").not("staff_role", "is", null).order("full_name");
  const forMe = (tasks ?? []).filter((t) => t.status === "review" && t.reviewer === s.user.id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Projects" sub="Client work, from kickoff to done.">
        <div className="flex flex-wrap gap-2">
          <Drawer label="Task" title="Add a task" variant="outline">
            <ActionForm action={addTask} submit="Add task" className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Task"><Input name="title" required /></Field></div>
            <Field label="Project"><Select name="project_id" defaultValue=""><option value="">No project</option>{projects?.filter((p) => p.status !== "done").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Due"><Input name="due_date" type="date" /></Field>
            <Field label="Who"><Select name="assignee" defaultValue={s.user.id}>{staff?.map((x) => <option key={x.id} value={x.id}>{x.full_name ?? "Staff"}</option>)}</Select></Field>
            <Field label="Priority"><Select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></Field>
          </ActionForm>
          </Drawer>
          <Drawer label="New project" title="New project" sub="Only the name is required. Add the rest any time.">
            <ActionForm action={saveProject} submit="Create project" className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Name"><Input name="name" required /></Field></div>
            <Field label="Client"><Select name="client_id" defaultValue=""><option value="">Internal</option>{clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Fee (KES)"><Input name="fee_kes" type="number" min="0" step="any" /></Field>
            <Field label="Start"><Input name="start_date" type="date" /></Field>
            <Field label="Due"><Input name="due_date" type="date" /></Field>
            <Field label="Status"><Select name="status" defaultValue="todo">{COLS.map((c) => <option key={c} value={c}>{label(c)}</option>)}</Select></Field>
            <Field label="Priority"><Select name="priority" defaultValue="medium"><option>low</option><option>medium</option><option>high</option></Select></Field>
            <div className="sm:col-span-2"><Field label="Description"><Textarea name="description" rows={2} /></Field></div>
          </ActionForm>
          </Drawer>
        </div>
      </PageHeader>
      {forMe.length ? (
        <div className="card mb-4 flex flex-wrap items-center gap-3 border-amber/30 bg-amber-100/70 py-4">
          <Eye className="size-5 text-amber-700" />
          <p className="flex-1 text-sm"><span className="font-semibold">{forMe.length} task{forMe.length === 1 ? "" : "s"} waiting for your review</span></p>
          {forMe.slice(0, 3).map((t) => <Link key={t.id} href={`/admin/projects/${t.project_id}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium hover:text-navy-700">{t.title}</Link>)}
        </div>
      ) : null}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-1">
        {COLS.map((col) => {
          const items = (projects ?? []).filter((p) => p.status === col);
          return (
            <section key={col} className="w-[85vw] max-w-80 shrink-0 snap-start rounded-[1.75rem] sm:w-80 bg-white/60 p-3">
              <p className="mb-3 px-2 text-sm font-semibold">{label(col)} <span className="text-muted">{items.length}</span></p>
              <div className="space-y-2">
                {items.map((p) => {
                  const pt = (tasks ?? []).filter((t) => t.project_id === p.id);
                  const done = pt.filter((t) => t.status === "done").length;
                  return (
                    <article key={p.id} className="lift rounded-3xl bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/admin/projects/${p.id}`} className="text-sm font-medium hover:text-navy-700">{p.name}</Link>
                        <Badge tone={PRI[p.priority as keyof typeof PRI]}>{p.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted">{(p.clients as unknown as { name: string } | null)?.name ?? "Internal"}</p>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className={p.due_date && p.due_date < today && col !== "done" ? "font-medium text-bad" : "text-muted"}>{p.due_date ? `Due ${day(p.due_date)}` : "No due date"}</span>
                        {p.fee_kes ? <span className="num">{kes(p.fee_kes)}</span> : null}
                      </div>
                      {pt.length ? <div className="mt-3 h-1.5 rounded-full bg-sunken"><div className="h-full rounded-full bg-green" style={{ width: `${Math.round((done / pt.length) * 100)}%` }} /></div> : null}
                      {pt.length ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted">{done}/{pt.length} tasks</summary>
                          <ul className="mt-2 space-y-1">
                            {pt.map((t) => (
                              <li key={t.id}>
                                <form action={toggleTask} className="flex items-center gap-2">
                                  <input type="hidden" name="id" value={t.id} />
                                  <input type="hidden" name="done" value={t.status === "done" ? "0" : "1"} />
                                  <button aria-label={t.status === "done" ? "Mark not done" : "Mark done"} className={`grid size-4 shrink-0 place-items-center rounded-full border ${t.status === "done" ? "border-navy-900 bg-navy-900 text-[9px] text-mint" : "border-line"}`}>{t.status === "done" ? "✓" : ""}</button>
                                  <span className={`text-xs ${t.status === "done" ? "text-muted line-through" : ""}`}>{t.title}</span>
                                </form>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-2">
                      <Link href={`/admin/projects/${p.id}`} className="text-xs font-medium text-navy-600">Open · add tasks →</Link>
                      <form action={setProjectStatus} className="flex gap-1">
                        <input type="hidden" name="id" value={p.id} />
                        <select name="status" defaultValue={p.status} aria-label="Status" className="rounded-full bg-sunken px-2 py-1 text-xs">{COLS.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>
                        <button className="text-xs text-navy-600 underline">Move</button>
                      </form>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

    </>
  );
}
