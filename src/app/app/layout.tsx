import { guardMemberSide, requireMember } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { MemberNav } from "@/components/member-nav";
import { MemberTabBar } from "@/components/mobile-nav";
import { UserMenu } from "@/components/user-menu";
import { switchOrganization } from "@/actions/member";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await guardMemberSide();
  const m = await requireMember();
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-3 rounded-[1.75rem] border border-white/80 bg-white/70 py-2 pr-2 pl-4 shadow-[0_12px_40px_-24px_rgba(13,28,41,0.25)] backdrop-blur-xl sm:rounded-full sm:pl-5">
        <div className="flex items-center gap-4">
          <Logo href="/app" size="sm" />
          {m.orgs.length > 1 ? (
            <form action={switchOrganization}>
              <select name="org_id" defaultValue={m.org.id} aria-label="Switch company"
                className="max-w-36 rounded-full bg-sunken px-3 py-1.5 text-sm sm:max-w-none">
                {m.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button className="ml-1 text-xs text-muted underline">Switch</button>
            </form>
          ) : null}
        </div>
        <div className="hidden lg:block"><MemberNav /></div>
        <UserMenu name={m.profile?.full_name ?? ""} email={m.user.email ?? ""} staff={Boolean(m.profile?.staff_role)} />
      </header>
      <main className="pt-8 pb-32 sm:pt-10 lg:pb-16">{children}</main>
      <MemberTabBar />
    </div>
  );
}
