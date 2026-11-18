import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin-nav";
import { UserMenu } from "@/components/user-menu";
import { label } from "@/lib/format";

export const metadata: Metadata = { title: { default: "Workspace", template: "%s · Dhow workspace" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff();
  return (
    <div className="mx-auto flex max-w-[1440px] gap-5 p-4 lg:p-5">
      <aside className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-64 shrink-0 flex-col rounded-[2rem] bg-white p-5 lg:flex">
        <div className="mb-8 px-1">
          <Logo href="/admin" size="sm" />
          <p className="mt-2 text-[11px] font-semibold tracking-wider text-faint uppercase">Staff workspace</p>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto"><AdminNav role={s.staffRole} /></div>
        <p className="mt-4 px-3 text-xs text-faint">Signed in as {label(s.staffRole)}</p>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="mb-6 flex items-center justify-between gap-4">
          <details className="lg:hidden">
            <summary className="cursor-pointer list-none rounded-full bg-white px-4 py-2 text-sm font-medium">Menu</summary>
            <div className="absolute z-30 mt-2 w-72 rounded-3xl bg-white p-4 shadow-xl ring-1 ring-line"><AdminNav role={s.staffRole} /></div>
          </details>
          <div className="hidden lg:block" />
          <UserMenu name={s.profile?.full_name ?? ""} email={s.user.email ?? ""} staff={false} helpHref="/admin/help" />
        </header>
        <main className="pb-16">{children}</main>
      </div>
    </div>
  );
}
