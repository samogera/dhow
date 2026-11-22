import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, CalendarClock, CheckSquare, FileWarning, Receipt, Target, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { loadAlerts, type Alert } from "@/lib/alerts";
import { Empty, PageHeader } from "@/components/ui";
import { cn } from "@/lib/format";

export const metadata: Metadata = { title: "Alerts" };

const ICON: Record<Alert["kind"], typeof AlertTriangle> = { licence: FileWarning, invoice: Receipt, bill: Wallet, task: CheckSquare, review: BadgeCheck, lead: Target };
const KIND: Record<Alert["kind"], string> = { licence: "Licences and documents", invoice: "Money owed to us", bill: "Bills to pay", task: "Your tasks", review: "Waiting for review", lead: "Leads to follow up" };

export default async function Alerts() {
  const s = await requireStaff();
  const alerts = await loadAlerts(s.supabase, s.user.id, s.staffRole === "admin" || s.staffRole === "finance");
  const urgent = alerts.filter((a) => a.level === "urgent");
  const soon = alerts.filter((a) => a.level === "soon");

  const List = ({ items }: { items: Alert[] }) => (
    <ul className="space-y-2">
      {items.map((a) => {
        const Icon = ICON[a.kind];
        return (
          <li key={a.id}>
            <Link href={a.href} className="card lift flex items-center gap-4 py-4">
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", a.level === "urgent" ? "bg-bad/10 text-bad" : "bg-amber-100 text-amber-700")}><Icon className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-muted">{KIND[a.kind]} · {a.detail}</p>
              </div>
              <span className="text-sm font-medium text-navy-600">Open →</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader title="Alerts" sub="Expiring licences and documents, money that's due, late tasks and things waiting for you." />
      {!alerts.length ? (
        <Empty title="All clear" sub="Nothing needs attention right now. Add expiry dates to licences and documents so we can warn you in time." />
      ) : (
        <div className="space-y-8">
          {urgent.length ? <section><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-bad uppercase"><AlertTriangle className="size-4" />Urgent</h2><List items={urgent} /></section> : null}
          {soon.length ? <section><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-amber-700 uppercase"><CalendarClock className="size-4" />Coming up</h2><List items={soon} /></section> : null}
        </div>
      )}
    </>
  );
}
