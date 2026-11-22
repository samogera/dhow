import type { Metadata } from "next";
import { guardMemberSide, requireMember } from "@/lib/auth";
import { TIERS, atLeast, tierOf } from "@/lib/plans";
import { timer } from "@/lib/timing";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
import { AccountMenu, MemberNav, MobileMenu } from "@/components/member-nav";
import { switchOrganization } from "@/actions/member";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const tick = timer("member layout");
  await guardMemberSide();
  const m = await requireMember();
  // "Our work" shows for anyone Dhow has linked as a client, whatever their plan.
  const { data: linked } = await createAdminClient().from("clients").select("id").eq("org_id", m.org.id).limit(1);
  const work = Boolean(linked?.length) || atLeast(m.org, "enterprise");
  const investors = atLeast(m.org, "premium");
  const plan = TIERS[tierOf(m.org)].name;
  const name = m.profile?.full_name ?? "";
  const email = m.user.email ?? "";
  const staff = Boolean(m.profile?.staff_role);
  tick("ready");
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
      <header className="sticky top-3 z-30 flex items-center justify-between gap-3 rounded-full border border-white/80 bg-white/80 py-2 pr-2 pl-5 shadow-[0_12px_40px_-24px_rgba(13,28,41,0.25)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <Logo href="/app" size="sm" />
          {m.orgs.length > 1 ? (
            <form action={switchOrganization} className="hidden sm:block">
              <select name="org_id" defaultValue={m.org.id} aria-label="Switch company"
                className="max-w-40 rounded-full bg-sunken px-3 py-1.5 text-sm">
                {m.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <SubmitButton className="ml-1 text-xs text-muted underline">Switch</SubmitButton>
            </form>
          ) : null}
        </div>
        <div className="hidden lg:block"><MemberNav investors={investors} work={work} /></div>
        <AccountMenu name={name} email={email} company={m.org.name} plan={plan} staff={staff} avatar={m.profile?.avatar_url} />
        <MobileMenu investors={investors} work={work} name={name} email={email} plan={plan} staff={staff} avatar={m.profile?.avatar_url} />
      </header>
      <main className="pt-8 pb-16 sm:pt-10">{children}</main>
    </div>
  );
}
