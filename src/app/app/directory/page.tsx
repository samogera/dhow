import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, Search, UsersRound } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { Avatar, SocialLinks } from "@/components/profile-bits";
import { RequestButton } from "@/components/request-button";
import { VerifiedTick } from "@/components/verified-tick";
import { cn } from "@/lib/format";

export const metadata: Metadata = { title: "Member directory" };

type Listed = {
  id: string; name: string; logo_url: string | null; sector: string | null; tagline: string | null; about: string | null; website: string | null;
  country: string; socials: Record<string, string> | null; listed_contact: boolean; email: string | null; phone: string | null;
};

/** Verified member companies that chose to be listed. Only the fields shown here leave the database. */
export default async function Directory({ searchParams }: { searchParams: Promise<{ q?: string; sector?: string }> }) {
  const { org } = await requireMember();
  const sp = await searchParams;
  const { data } = await createAdminClient().from("organizations")
    .select("id, name, logo_url, sector, tagline, about, website, country, socials, listed_contact, email, phone")
    .eq("listed", true).eq("verification_status", "verified").order("name").limit(500);
  const all = (data ?? []) as Listed[];
  const q = (sp.q ?? "").trim().toLowerCase();
  const list = all.filter((c) => (!sp.sector || c.sector === sp.sector) && (!q || [c.name, c.tagline, c.about, c.sector].some((v) => v?.toLowerCase().includes(q))));
  const sectors = [...new Set(all.map((c) => c.sector).filter(Boolean))].sort() as string[];
  const me = all.some((c) => c.id === org.id);
  const { data: open } = await createAdminClient().from("member_requests").select("target_id").eq("org_id", org.id).eq("kind", "member_intro").in("status", ["new", "in_progress"]);
  const asked = new Set((open ?? []).map((r) => r.target_id as string));

  return (
    <>
      <PageHeader title="Member directory" sub="Verified companies in the Dhow network that chose to be found. Reach out to work together.">
        <form className="relative w-full sm:w-72">
          {sp.sector ? <input type="hidden" name="sector" value={sp.sector} /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="q" defaultValue={sp.q} placeholder="Search companies" aria-label="Search companies" className="field rounded-full py-2.5 pl-11" />
        </form>
      </PageHeader>

      {!me ? (
        <Link href="/app/settings#directory" className="mb-6 flex items-center gap-3 rounded-3xl border border-dashed border-navy-200 bg-white/70 px-5 py-4 text-sm transition hover:bg-white">
          <UsersRound className="size-5 shrink-0 text-navy-600" />
          <span className="flex-1"><span className="font-semibold">Want other members to find you?</span><span className="block text-muted">Switch on your listing in Settings. {org.verification_status === "verified" ? "It takes a second." : "You'll appear once you're verified."}</span></span>
          <span className="font-medium text-navy-600">Settings →</span>
        </Link>
      ) : null}

      {sectors.length > 1 ? (
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {sectors.map((s) => (
            <Link key={s} href={`/app/directory?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.sector === s ? {} : { sector: s }) })}`}
              className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition", sp.sector === s ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-ink/70 hover:text-ink")}>{s}</Link>
          ))}
        </div>
      ) : null}

      {list.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <article key={c.id} className="card flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Avatar src={c.logo_url} name={c.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-1.5 font-semibold text-navy-900"><span className="truncate">{c.name}</span><VerifiedTick label={false} /></h2>
                  <p className="truncate text-sm text-muted">{[c.sector, c.country].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              {c.tagline || c.about ? <p className="line-clamp-3 text-sm text-ink/80">{c.tagline || c.about}</p> : null}
              <div className="mt-auto space-y-2 border-t border-line pt-3 text-sm">
                {c.listed_contact && c.email ? <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-navy-600"><Mail className="size-4" />{c.email}</a> : null}
                {c.listed_contact && c.phone ? <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-navy-600"><Phone className="size-4" />{c.phone}</a> : null}
                {c.website || Object.keys(c.socials ?? {}).length ? <SocialLinks website={c.website} socials={c.socials} /> : null}
                {c.id !== org.id ? <div className="pt-1"><RequestButton kind="member_intro" targetId={c.id} label="Ask Dhow to introduce you" placeholder="What would you like to talk to them about? (optional)" done={asked.has(c.id)} /></div> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card py-12 text-center">
          <UsersRound className="mx-auto size-7 text-faint" />
          <p className="mt-3 font-semibold">{q || sp.sector ? "No companies match" : "The directory is just getting started"}</p>
          <p className="mt-1 text-sm text-muted">{q || sp.sector ? "Try another word or clear the filter." : "Verified members who switch on their listing will appear here."}</p>
        </div>
      )}
    </>
  );
}
