"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck, BarChart3, Briefcase, Building2, CalendarDays, FolderKanban, Handshake, LayoutGrid, LifeBuoy, Megaphone, Receipt, ShieldCheck, Target, Users,
} from "lucide-react";
import { cn } from "@/lib/format";

const groups = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutGrid },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Members",
    items: [
      { href: "/admin/reviews", label: "Verification reviews", icon: BadgeCheck },
      { href: "/admin/members", label: "Member companies", icon: Building2 },
      { href: "/admin/opportunities", label: "Opportunities", icon: Megaphone },
    ],
  },
  {
    title: "Clients and work",
    items: [
      { href: "/admin/leads", label: "Leads", icon: Target },
      { href: "/admin/clients", label: "Clients", icon: Users },
      { href: "/admin/partners", label: "Partners", icon: Handshake },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    title: "Money",
    items: [{ href: "/admin/finance", label: "Finance", icon: Receipt }],
  },
  {
    title: "Company",
    items: [
      { href: "/admin/company", label: "Dhow profile", icon: Briefcase },
      { href: "/admin/team", label: "Team and access", icon: ShieldCheck },
      { href: "/admin/help", label: "Help and guides", icon: LifeBuoy },
    ],
  },
];

export function AdminNav({ role, counts = {} }: { role: "reviewer" | "finance" | "admin"; counts?: Record<string, number> }) {
  const path = usePathname();
  // Reviewers don't see money. The pages check roles on the server too; this just keeps the menu honest.
  const visible = groups.filter((g) => g.title !== "Money" || role !== "reviewer");
  return (
    <nav aria-label="Admin" className="space-y-6">
      {visible.map((g) => (
        <div key={g.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-faint uppercase">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon }) => {
              const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
              return (
                <li key={href}>
                  <Link href={href} aria-current={on ? "page" : undefined}
                    className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition", on ? "bg-white font-medium text-navy-900 shadow-sm" : "text-ink/75 hover:bg-white/60")}>
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {counts[href] ? <span className={cn("num min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold", on ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-900")}>{counts[href]}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
