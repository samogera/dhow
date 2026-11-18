import { requireMember } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { MemberNav } from "@/components/member-nav";
import { UserMenu } from "@/components/user-menu";
import { switchOrganization } from "@/actions/member";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const m = await requireMember();
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-full bg-white py-2 pr-2 pl-5">
        <div className="flex items-center gap-4">
          <Logo href="/app" size="sm" />
          {m.orgs.length > 1 ? (
            <form action={switchOrganization}>
              <select name="org_id" defaultValue={m.org.id} aria-label="Switch company"
                className="rounded-full bg-sunken px-3 py-1.5 text-sm">
                {m.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button className="ml-1 text-xs text-muted underline">Switch</button>
            </form>
          ) : null}
        </div>
        <div className="order-3 w-full md:order-none md:w-auto"><MemberNav /></div>
        <UserMenu name={m.profile?.full_name ?? ""} email={m.user.email ?? ""} staff={Boolean(m.profile?.staff_role)} />
      </header>
      <main className="pt-10 pb-16">{children}</main>
    </div>
  );
}
