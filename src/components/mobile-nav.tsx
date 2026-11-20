"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeCheck, Briefcase, FileText, LayoutGrid, Megaphone, Menu, Receipt, Send, Settings, Target, X,
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
      className="fixed inset-x-3 bottom-3 z-40 flex rounded-[1.75rem] border border-line bg-white/95 p-1.5 shadow-[0_8px_30px_-12px_rgba(13,28,41,0.25)] backdrop-blur-md lg:hidden"
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
export function AdminMobileNav({ role, account }: { role: "reviewer" | "finance" | "admin"; account: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const tabs: Tab[] = [
    { href: "/admin", label: "Home", icon: LayoutGrid, exact: true },
    { href: "/admin/reviews", label: "Reviews", icon: BadgeCheck },
    { href: "/admin/leads", label: "Leads", icon: Target },
    role === "reviewer" ? { href: "/admin/projects", label: "Projects", icon: Briefcase } : { href: "/admin/finance", label: "Finance", icon: Receipt },
  ];

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 mb-5 flex items-center justify-between border-b border-line/70 bg-canvas/90 px-4 py-3 backdrop-blur-md lg:hidden">
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
            <AdminNav role={role} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Member app on phones: a bottom tab bar with every section. */
export function MemberTabBar() {
  return (
    <TabBar tabs={[
      { href: "/app", label: "Home", icon: LayoutGrid, exact: true },
      { href: "/app/documents", label: "Files", icon: FileText },
      { href: "/app/verification", label: "Verify", icon: BadgeCheck },
      { href: "/app/opportunities", label: "Explore", icon: Megaphone },
      { href: "/app/applications", label: "Applied", icon: Send },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ]} />
  );
}
