"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Building2, Crown, FileText, UserRound } from "lucide-react";
import { cn } from "@/lib/format";

const TABS = [
  { href: "/app/settings", label: "Company", icon: Building2 },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/verification", label: "Verification", icon: BadgeCheck },
  { href: "/app/plans", label: "Plan", icon: Crown },
  { href: "/app/settings/account", label: "You & emails", icon: UserRound },
];

/** One place for everything about the company and the person: company, documents, verification, email choices. */
export function SettingsTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Settings" className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {TABS.map((t) => {
        const on = t.href === "/app/settings" ? path === "/app/settings" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm whitespace-nowrap transition", on ? "bg-navy-900 font-medium text-white" : "bg-white/70 text-ink/75 hover:bg-white")}>
            <t.icon className="size-4" />{t.label}
          </Link>
        );
      })}
    </nav>
  );
}
