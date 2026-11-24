"use client";
import { useActionState, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { INVESTOR_KIND, INSTRUMENT_HINT } from "@/lib/investors";
import { requestInvestorDeletion, saveInvestorProfile, type InvestorState } from "@/actions/investor-portal";

type P = { name: string; kind: string | null; contact_role: string | null; instruments: string[]; phone: string | null; alerts: { alert_new_request: boolean; alert_intro_update: boolean; alert_new_companies: boolean };
  contact_name: string | null; email: string | null; about: string | null; ticket: string | null; countries: string | null; website: string | null; sectors: string[]; stages: string[]; logo_url: string | null };

/** The investor keeps their own profile current, and can ask us to delete it. */
export function InvestorProfile({ token, p }: { token: string; p: P }) {
  const [open, setOpen] = useState(false);
  const [state, action, busy] = useActionState<InvestorState, FormData>(saveInvestorProfile, {});
  const [del, delAction, deleting] = useActionState<InvestorState, FormData>(requestInvestorDeletion, {});
  const [confirmDel, setConfirmDel] = useState(false);
  const field = "field bg-white";
  return (
    <section className="rounded-[1.75rem] bg-white p-5 ring-1 ring-line sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {p.logo_url ? <img src={p.logo_url} alt="" className="size-12 rounded-xl object-contain ring-1 ring-line" /> : <span className="grid size-12 place-items-center rounded-xl bg-navy-50 text-lg font-semibold text-navy-700">{p.name[0]}</span>}
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Your profile</h2>
            <p className="text-sm text-muted">{p.email ? `We email ${p.email} when a company asks to meet you.` : "Add an email and we'll tell you when a company asks to meet you."}</p>
          </div>
        </div>
        {!open ? <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-sunken"><Pencil className="size-4" />Edit profile</button> : null}
      </div>

      {open ? (
        <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="token" value={token} />
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:col-span-2">About {p.name}</p>
          <label className="text-sm">Type of investor<select name="kind" defaultValue={p.kind ?? "fund"} className={`${field} mt-1`}>{Object.entries(INVESTOR_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm">Website<input name="website" defaultValue={p.website ?? ""} placeholder="https://" className={`${field} mt-1`} /></label>
          <label className="text-sm sm:col-span-2">What you look for<textarea name="about" rows={3} maxLength={1200} defaultValue={p.about ?? ""} className={`${field} mt-1 min-h-0`} /></label>
          <label className="text-sm sm:col-span-2">Logo <span className="text-muted">(PNG or JPG, up to 3 MB)</span><input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="mt-1 block w-full text-sm text-muted" /></label>

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:col-span-2">How you invest</p>
          <label className="text-sm">Ticket size<input name="ticket" defaultValue={p.ticket ?? ""} placeholder="USD 50k to 500k" className={`${field} mt-1`} /></label>
          <label className="text-sm">How you fund <span className="text-muted">(separate with commas)</span><input name="instruments" defaultValue={p.instruments.join(", ")} placeholder={INSTRUMENT_HINT} className={`${field} mt-1`} /></label>
          <label className="text-sm">Sectors <span className="text-muted">(separate with commas)</span><input name="sectors" defaultValue={p.sectors.join(", ")} className={`${field} mt-1`} /></label>
          <label className="text-sm">Stages <span className="text-muted">(separate with commas)</span><input name="stages" defaultValue={p.stages.join(", ")} placeholder="Early, Growth" className={`${field} mt-1`} /></label>
          <label className="text-sm sm:col-span-2">Where you invest <span className="text-muted">(separate with commas)</span><input name="countries" defaultValue={p.countries ?? ""} placeholder="Kenya, Uganda" className={`${field} mt-1`} /></label>

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:col-span-2">Your contact <span className="normal-case tracking-normal font-normal">· only Dhow Partners sees these</span></p>
          <label className="text-sm">Contact person<input name="contact_name" defaultValue={p.contact_name ?? ""} className={`${field} mt-1`} /></label>
          <label className="text-sm">Role<input name="contact_role" defaultValue={p.contact_role ?? ""} placeholder="Investment manager" className={`${field} mt-1`} /></label>
          <label className="text-sm">Email for alerts<input name="email" type="email" defaultValue={p.email ?? ""} placeholder="you@fund.com" className={`${field} mt-1`} /></label>
          <label className="text-sm">Phone<input name="phone" type="tel" defaultValue={p.phone ?? ""} placeholder="+254 700 000 000" className={`${field} mt-1`} /></label>

          <fieldset className="mt-3 space-y-2 rounded-2xl bg-sunken p-4 sm:col-span-2">
            <legend className="sr-only">Alerts</legend>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Email me when</p>
            {([["alert_new_request", "A company asks to meet us"], ["alert_intro_update", "Dhow Partners makes an introduction"], ["alert_new_companies", "New companies in our sectors join (once membership opens)"]] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2.5 text-sm"><input type="checkbox" name={k} defaultChecked={p.alerts[k]} className="size-4 accent-[var(--color-green)]" />{label}</label>
            ))}
            <p className="text-xs text-muted">Everything also shows under Notifications on this page, as it happens.</p>
          </fieldset>
          {state.error ? <p className="text-sm text-bad sm:col-span-2">{state.error}</p> : state.ok ? <p className="text-sm text-green sm:col-span-2">{state.ok}</p> : null}
          <div className="flex items-center justify-end gap-3 sm:col-span-2">
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">Close</button>
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
              {busy ? <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}{busy ? "Saving" : "Save profile"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 border-t border-line pt-4">
        {del.ok ? <p className="text-sm text-green">{del.ok}</p> : confirmDel ? (
          <form action={delAction} className="flex flex-wrap items-center gap-3 text-sm">
            <input type="hidden" name="token" value={token} />
            <span className="text-ink/80">Delete your profile and this page? Companies won&apos;t see you any more.</span>
            <button disabled={deleting} className="rounded-xl bg-bad px-4 py-2 font-semibold text-white disabled:opacity-60">{deleting ? "Sending" : "Yes, ask to delete"}</button>
            <button type="button" onClick={() => setConfirmDel(false)} className="text-muted hover:text-ink">Keep it</button>
            {del.error ? <span className="text-bad">{del.error}</span> : null}
          </form>
        ) : (
          <button type="button" onClick={() => setConfirmDel(true)} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-bad"><Trash2 className="size-3.5" />Ask Dhow Partners to delete my profile</button>
        )}
      </div>
    </section>
  );
}
