import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin-nav";
import { UserMenu } from "@/components/user-menu";
import { AdminMobileNav } from "@/components/mobile-nav";
import { label } from "@/lib/format";

export const metadata: Metadata = { title: { default: "Workspace", template: "%s · Dhow workspace" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff();
  const account = <UserMenu name={s.profile?.full_name ?? ""} email={s.user.email ?? ""} staff={false} helpHref="/admin/help" />;
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
        <AdminMobileNav role={s.staffRole} account={account} />
        <header className="mb-6 hidden items-center justify-end lg:flex">{account}</header>
        <main className="pb-32 lg:pb-16">{children}</main>
      </div>
    </div>
  );
}
