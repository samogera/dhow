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

/** Settings with a quiet sidebar on desktop and a simple tab row on phones. */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav aria-label="Settings" className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto px-4 lg:sticky lg:top-6 lg:mx-0 lg:mb-0 lg:flex-col lg:overflow-visible lg:px-0">
        {TABS.map((t) => {
          const on = t.href === "/app/settings" ? path === "/app/settings" : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
              className={cn("flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition",
                on ? "bg-white font-medium text-navy-900 shadow-sm ring-1 ring-line" : "text-ink/70 hover:bg-white/70 hover:text-ink")}>
              <t.icon className={cn("size-4", on ? "text-navy-700" : "text-ink/45")} strokeWidth={1.75} />{t.label}
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
