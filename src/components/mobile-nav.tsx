"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeCheck, Briefcase, CalendarDays, FileText, LayoutGrid, LifeBuoy, Megaphone, Menu, Receipt, Send, Settings, UsersRound, X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin-nav";
import { cn } from "@/lib/format";

type Tab = { href: string; label: string; icon: typeof LayoutGrid; exact?: boolean };

function TabBar({ tabs, onMore, moreOpen }: { tabs: Tab[]; onMore?: () => void; moreOpen?: boolean }) {
  const path = usePathname();
  const item = "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition";
  return (
    <nav aria-label="Sections"
      className="fixed inset-x-3 bottom-3 z-40 flex rounded-[1.75rem] border border-white/80 bg-white/80 p-1.5 shadow-[0_8px_30px_-12px_rgba(13,28,41,0.25)] backdrop-blur-xl lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map((t) => {
        const on = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
            className={cn(item, on ? "bg-navy-50 text-navy-900" : "text-muted")}>
            <t.icon className="size-5" strokeWidth={on ? 2.2 : 1.8} />
            {t.label}
          </Link>
        );
      })}
      {onMore ? (
        <button type="button" onClick={onMore} aria-expanded={moreOpen} className={cn(item, moreOpen ? "bg-navy-50 text-navy-900" : "text-muted")}>
          <Menu className="size-5" strokeWidth={1.8} />
          More
        </button>
      ) : null}
    </nav>
  );
}

/** Staff workspace on phones and tablets: top bar, bottom tabs, and a slide-up sheet with the full menu. */
export function AdminMobileNav({ role, account, counts }: { role: "employee" | "reviewer" | "finance" | "admin"; account: React.ReactNode; counts?: Record<string, number> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const tabs: Tab[] = [
    { href: "/admin", label: "Home", icon: LayoutGrid, exact: true },
    { href: "/admin/clients", label: "Clients", icon: UsersRound },
    { href: "/admin/projects", label: "Work", icon: Briefcase },
    role === "admin" || role === "finance" ? { href: "/admin/finance", label: "Money", icon: Receipt } : { href: "/admin/leads", label: "Leads", icon: BadgeCheck },
  ];

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 mb-5 flex items-center justify-between border-b border-white/70 bg-white/60 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo href="/admin" size="sm" />
        {account}
      </div>
      <TabBar tabs={tabs} onMore={() => setOpen((v) => !v)} moreOpen={open} />
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[2rem] bg-white px-5 pt-3 pb-8 shadow-2xl"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-semibold">Menu</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-sunken"><X className="size-4" /></button>
            </div>
            <AdminNav role={role} counts={counts} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Member app on phones: four main tabs and a "More" sheet for the rest. */
export function MemberTabBar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const more = [
    { href: "/app/verification", label: "Verification", sub: "Get or renew your Dhow Verified badge", icon: BadgeCheck },
    { href: "/app/documents", label: "Documents", sub: "Your company files", icon: FileText },
    { href: "/app/settings", label: "Settings", sub: "Company profile, logo, team", icon: Settings },
    { href: "/help", label: "Help Centre", sub: "Guides for every page", icon: LifeBuoy },
  ];
  return (
    <>
      <TabBar onMore={() => setOpen((o) => !o)} moreOpen={open || more.some((m) => path.startsWith(m.href))} tabs={[
        { href: "/app", label: "Home", icon: LayoutGrid, exact: true },
        { href: "/app/opportunities", label: "Explore", icon: Megaphone },
        { href: "/app/events", label: "Events", icon: CalendarDays },
        { href: "/app/applications", label: "Applied", icon: Send },
      ]} />
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-navy-950/30 backdrop-blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-white px-5 pt-3 pb-10 shadow-2xl" style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            <div className="mb-3 flex items-center justify-between"><p className="text-lg font-semibold">More</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-sunken"><X className="size-5" /></button></div>
            <ul className="space-y-1">
              {more.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} className={cn("flex items-center gap-4 rounded-2xl p-3 transition", path.startsWith(m.href) ? "bg-navy-50" : "hover:bg-sunken")}>
                    <span className="grid size-10 place-items-center rounded-xl bg-navy-50 text-navy-700"><m.icon className="size-5" /></span>
                    <span><span className="block font-medium">{m.label}</span><span className="block text-sm text-muted">{m.sub}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
