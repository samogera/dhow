"use client";
import { useActionState, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { requestInvestorDeletion, saveInvestorProfile, type InvestorState } from "@/actions/investor-portal";

type P = { name: string; contact_name: string | null; email: string | null; about: string | null; ticket: string | null; countries: string | null; website: string | null; sectors: string[]; stages: string[]; logo_url: string | null };

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
          <label className="text-sm">Contact person<input name="contact_name" defaultValue={p.contact_name ?? ""} className={`${field} mt-1`} /></label>
          <label className="text-sm">Email for alerts<input name="email" type="email" defaultValue={p.email ?? ""} placeholder="you@fund.com" className={`${field} mt-1`} /></label>
          <label className="text-sm">Ticket size<input name="ticket" defaultValue={p.ticket ?? ""} placeholder="USD 50k to 500k" className={`${field} mt-1`} /></label>
          <label className="text-sm">Where you invest<input name="countries" defaultValue={p.countries ?? ""} placeholder="Kenya, East Africa" className={`${field} mt-1`} /></label>
          <label className="text-sm">Sectors <span className="text-muted">(separate with commas)</span><input name="sectors" defaultValue={p.sectors.join(", ")} className={`${field} mt-1`} /></label>
          <label className="text-sm">Stages <span className="text-muted">(separate with commas)</span><input name="stages" defaultValue={p.stages.join(", ")} placeholder="Early, Growth" className={`${field} mt-1`} /></label>
          <label className="text-sm sm:col-span-2">Website<input name="website" defaultValue={p.website ?? ""} placeholder="https://" className={`${field} mt-1`} /></label>
          <label className="text-sm sm:col-span-2">What you look for<textarea name="about" rows={3} maxLength={1200} defaultValue={p.about ?? ""} className={`${field} mt-1 min-h-0`} /></label>
          <label className="text-sm sm:col-span-2">Logo <span className="text-muted">(PNG or JPG, up to 3 MB)</span><input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="mt-1 block w-full text-sm text-muted" /></label>
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
