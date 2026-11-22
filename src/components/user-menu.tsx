import Link from "next/link";
import { Crown, LifeBuoy, LogOut, Settings, Shield } from "lucide-react";
import { signOut } from "@/actions/auth";

export function UserMenu({ name, email, staff, helpHref = "/help", settingsHref }: { name: string; email: string; staff: boolean; helpHref?: string; settingsHref?: string }) {
  const initials = (name || email).split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full bg-white py-1 pr-4 pl-1 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 place-items-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">{initials}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium">{name || "Your account"}</span>
          <span className="block max-w-40 truncate text-xs text-muted">{email}</span>
        </span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 rounded-3xl bg-white p-2 shadow-xl shadow-black/5 ring-1 ring-line">
        {staff ? (
          <Link href="/admin" className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm hover:bg-sunken">
            <Shield className="size-4" /> Dhow workspace
          </Link>
        ) : null}
        {settingsHref ? (
          <Link href={settingsHref} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm hover:bg-sunken">
            <Settings className="size-4" /> Company and account settings
          </Link>
        ) : null}
        {settingsHref === "/app/settings" ? (
          <Link href="/app/plans" className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm hover:bg-sunken">
            <Crown className="size-4" /> Membership plan
          </Link>
        ) : null}
        <Link href={helpHref} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm hover:bg-sunken">
          <LifeBuoy className="size-4" /> Help Centre
        </Link>
        <form action={signOut}>
          <button className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm hover:bg-sunken">
            <LogOut className="size-4" /> Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
