import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Card, Empty, PageHeader } from "@/components/ui";
import { sendApplicationEmailNow, setApplicationReview } from "@/actions/membership-applications";
import { applicationsClose } from "@/lib/membership-intake";
import { cn, day } from "@/lib/format";

export const metadata: Metadata = { title: "Membership applications" };

const STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-sunken text-ink/75" },
  accepted: { label: "Accepted", tone: "bg-mint-100 text-green" },
  waitlisted: { label: "Waitlisted", tone: "bg-amber-100 text-amber-700" },
  declined: { label: "Declined", tone: "bg-bad/10 text-bad" },
  joined: { label: "Joined", tone: "bg-navy-900 text-white" },
};

type A = {
  id: string; name: string; role: string | null; email: string; phone: string | null; company: string | null; registered: string | null; sector: string | null;
  years: string | null; revenue: string | null; website: string | null; plan: string | null; heard: string | null; needs: string | null; goals: string | null;
  investors: boolean; status: string; staff_note: string | null; thanks_sent_at: string | null; decision_sent_at: string | null; next_steps_sent_at: string | null; created_at: string;
};

export default async function Applications({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "all" } = await searchParams;
  const s = await requireStaff();
  const { data } = await s.supabase.from("membership_applications").select("*").order("created_at", { ascending: false }).limit(500);
  const all = (data ?? []) as A[];
  const list = show === "all" ? all : all.filter((a) => a.status === show);
  const closes = applicationsClose();
  const open = new Date().toISOString().slice(0, 10) < closes;

  return (
    <>
      <PageHeader title="Membership applications" sub={`From dhowpartners.com/apply. Applications close ${day(closes)}: ${open ? "outcome emails go out automatically that morning" : "outcome emails now go out each morning"}, and next steps 3 days after a congratulations.`} />
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {["all", "new", "accepted", "waitlisted", "declined", "joined"].map((k) => (
          <Link key={k} href={`/admin/applications${k === "all" ? "" : `?show=${k}`}`} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm", show === k ? "bg-navy-900 font-medium text-white" : "bg-white/70 text-ink/75 hover:bg-white")}>
            {k === "all" ? "All" : STATUS[k].label}<span className={cn("text-xs", show === k ? "text-white/70" : "text-faint")}>{k === "all" ? all.length : all.filter((a) => a.status === k).length}</span>
          </Link>
        ))}
      </div>
      {list.length ? (
        <div className="space-y-3">
          {list.map((a) => (
            <Card key={a.id} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold">{a.company || a.name}</p>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS[a.status]?.tone)}>{STATUS[a.status]?.label ?? a.status}</span>
                  {a.plan ? <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700">{a.plan}</span> : null}
                </div>
                <p className="mt-0.5 text-sm text-muted">{a.name}{a.role ? `, ${a.role}` : ""} · applied {day(a.created_at)}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 text-navy-600"><Mail className="size-3.5" />{a.email}</a>
                  {a.phone ? <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 text-navy-600"><Phone className="size-3.5" />{a.phone}</a> : null}
                  {a.website ? <a href={a.website.startsWith("http") ? a.website : `https://${a.website}`} target="_blank" rel="noopener noreferrer" className="text-navy-600">{a.website}</a> : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
                  {[["Registered", a.registered], ["Sector", a.sector], ["Trading", a.years], ["Revenue", a.revenue], ["Heard via", a.heard], ["Investor sharing", a.investors ? "Yes" : "No"]].map(([k, v]) => v ? <div key={k}><dt className="text-xs text-muted">{k}</dt><dd>{v}</dd></div> : null)}
                </dl>
                {a.needs ? <p className="mt-3 text-sm"><span className="text-muted">Needs: </span>{a.needs}</p> : null}
                {a.goals ? <p className="mt-1 text-sm"><span className="text-muted">Goals: </span>{a.goals}</p> : null}
                <p className="mt-3 text-xs text-faint">
                  {a.thanks_sent_at ? "Thank-you sent" : "Thank-you not sent"}
                  {a.decision_sent_at ? ` · outcome sent ${day(a.decision_sent_at)}` : ""}
                  {a.next_steps_sent_at ? ` · next steps sent ${day(a.next_steps_sent_at)}` : ""}
                </p>
              </div>
              <div className="space-y-2">
                <form action={setApplicationReview} className="space-y-2">
                  <input type="hidden" name="id" value={a.id} />
                  <select name="status" defaultValue={a.status} aria-label="Decision" className="field py-2 text-sm">
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <textarea name="staff_note" rows={2} defaultValue={a.staff_note ?? ""} placeholder="Team note" className="field min-h-0 resize-none text-sm" />
                  <button className="w-full rounded-xl bg-navy-900 px-3 py-2 text-sm font-medium text-white">Save</button>
                </form>
                {["accepted", "waitlisted", "declined"].includes(a.status) && !a.decision_sent_at ? (
                  <form action={sendApplicationEmailNow}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="which" value="decision" />
                    <button className="w-full rounded-xl border border-line px-3 py-2 text-sm hover:bg-sunken">Send outcome email now</button></form>
                ) : null}
                {a.status === "accepted" && a.decision_sent_at && !a.next_steps_sent_at ? (
                  <form action={sendApplicationEmailNow}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="which" value="next_steps" />
                    <button className="w-full rounded-xl border border-line px-3 py-2 text-sm hover:bg-sunken">Send next steps now</button></form>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      ) : <Empty title="No applications yet" sub="When someone applies on dhowpartners.com/apply, it shows here and they get a thank-you email." />}
    </>
  );
}
