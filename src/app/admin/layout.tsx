import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin-nav";
import { UserMenu } from "@/components/user-menu";
import { AdminMobileNav } from "@/components/mobile-nav";
import { SearchBox } from "@/components/search-box";
import { STAFF_ROLE_LABEL } from "@/lib/types";
import { loadAlerts } from "@/lib/alerts";
import Link from "next/link";
import { Bell } from "lucide-react";

export const metadata: Metadata = { title: { default: "Workspace", template: "%s · Dhow workspace" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff();
  const today = new Date().toISOString().slice(0, 10);
  const head = { count: "exact" as const, head: true };
  const [rv, op, tk] = await Promise.all([
    s.supabase.from("verifications").select("id", head).eq("status", "in_review"),
    s.supabase.from("opportunities").select("id", head).eq("published", false).is("dismissed_at", null).not("imported_at", "is", null),
    s.supabase.from("tasks").select("id", head).neq("status", "done").lt("due_date", today),
  ]);
  const alerts = await loadAlerts(s.supabase, s.user.id, s.staffRole === "admin" || s.staffRole === "finance").catch(() => []);
  const urgent = alerts.filter((a) => a.level === "urgent").length;
  const counts = { "/admin/alerts": alerts.length, "/admin/reviews": rv.count ?? 0, "/admin/opportunities": op.count ?? 0, "/admin/projects": tk.count ?? 0 };
  const bell = (
    <Link href="/admin/alerts" aria-label={`Alerts: ${alerts.length}`} className="relative grid size-11 shrink-0 place-items-center rounded-full border border-white/80 bg-white/70 backdrop-blur-xl transition hover:bg-white">
      <Bell className="size-5 text-navy-700" />
      {alerts.length ? <span className={`num absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold text-white ${urgent ? "bg-bad" : "bg-amber"}`}>{alerts.length}</span> : null}
    </Link>
  );
  const account = <div className="flex items-center gap-2">{bell}<UserMenu name={s.profile?.full_name ?? ""} email={s.user.email ?? ""} avatar={s.profile?.avatar_url} staff={false} helpHref="/admin/help" /></div>;
  return (
    <div className="mx-auto flex max-w-[1440px] gap-5 p-4 lg:p-5">
      <aside className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-64 shrink-0 flex-col rounded-[2rem] border border-white/80 bg-white/60 p-5 shadow-[0_12px_40px_-24px_rgba(13,28,41,0.25)] backdrop-blur-xl lg:flex">
        <div className="mb-8 px-1">
          <Logo href="/admin" size="sm" />
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-faint uppercase">Staff workspace</p>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto"><AdminNav role={s.staffRole} counts={counts} /></div>
        <p className="mt-4 px-3 text-xs text-faint">Signed in as {STAFF_ROLE_LABEL[s.staffRole]}</p>
      </aside>
      <div className="min-w-0 flex-1">
        <AdminMobileNav role={s.staffRole} account={account} counts={counts} />
        <header className="mb-6 hidden items-center justify-between gap-4 lg:flex"><SearchBox />{account}</header>
        <div className="mb-4 lg:hidden"><SearchBox placeholder="Search the workspace" /></div>
        <main className="pb-16">{children}</main>
      </div>
    </div>
  );
}
