"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck, BookOpen, Building2, CalendarDays, FolderKanban, Handshake, LayoutGrid, Link2, Megaphone, Receipt, ShieldCheck, Target, Users,
} from "lucide-react";
import { cn } from "@/lib/format";

const groups = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutGrid },
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
      { href: "/admin/wiki", label: "Wiki and SOPs", icon: BookOpen },
      { href: "/admin/links", label: "Links", icon: Link2 },
      { href: "/admin/team", label: "Staff and roles", icon: ShieldCheck },
    ],
  },
];

export function AdminNav({ role }: { role: "reviewer" | "finance" | "admin" }) {
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
                    className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition", on ? "bg-forest-900 text-white" : "text-ink/80 hover:bg-sunken")}>
                    <Icon className="size-4 shrink-0" />
                    {label}
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
