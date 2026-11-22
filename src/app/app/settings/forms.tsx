"use client";
import { useActionState } from "react";
import { deleteMyAccount, deleteMyCompany, inviteMember, saveEmailChoices, saveInterests, updateOrganization, updateProfile } from "@/actions/member";
import { saveCompanyProfile } from "@/actions/profiles";
import { ImageInput, SocialFields } from "@/components/profile-bits";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { COUNTRIES, SECTORS, type Organization } from "@/lib/types";

export function CompanyForm({ org, disabled }: { org: Organization; disabled: boolean }) {
  const [state, action] = useActionState(updateOrganization, undefined);
  const locked = org.verification_status === "verified";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <fieldset disabled={disabled} className="contents">
        <div className="sm:col-span-2"><Field label="Company name"><Input name="name" defaultValue={org.name} required /></Field></div>
        <div className="sm:col-span-2"><Field label="Registered in">
          <Select name="country" defaultValue={org.country}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field></div>
        <Field label="BRS registration number"><Input name="brs_number" defaultValue={org.brs_number ?? ""} readOnly={locked} /></Field>
        <Field label="Company KRA PIN" hint={org.kra_pin_last4 ? `Saved, ending ${org.kra_pin_last4}. Type to replace.` : "Stored encrypted"}>
          <Input name="kra_pin" placeholder={org.kra_pin_last4 ? `•••••••${org.kra_pin_last4}` : "P051234567X"} readOnly={locked} />
        </Field>
        <Field label="Registered P.O. Box" hint="Number only, as on your CR12"><Input name="postal_address" inputMode="numeric" placeholder="12345" defaultValue={org.postal_address ?? ""} readOnly={locked} /></Field>
        <Field label="Postal code"><Input name="postal_code" inputMode="numeric" placeholder="00100" defaultValue={org.postal_code ?? ""} readOnly={locked} /></Field>
        <div className="sm:col-span-2"><Field label="Website"><Input name="website" defaultValue={org.website ?? ""} /></Field></div>
        <div className="space-y-3 sm:col-span-2">
          <FormMessage state={state} />
          {!disabled ? <Submit>Save company</Submit> : <p className="text-sm text-muted">Only owners and admins can edit.</p>}
        </div>
      </fieldset>
    </form>
  );
}

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name"><Input name="full_name" defaultValue={name} required /></Field>
      <Field label="Mobile"><Input name="phone" defaultValue={phone ? `0${phone.slice(3)}` : ""} placeholder="0712 345 678" inputMode="tel" /></Field>
      <div className="space-y-3 sm:col-span-2"><FormMessage state={state} /><Submit variant="outline">Save profile</Submit></div>
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-60 flex-1"><Field label="Invite by email"><Input name="email" type="email" required placeholder="colleague@company.com" /></Field></div>
      <div className="w-40"><Field label="Role"><Select name="role" defaultValue="member"><option value="member">Member</option><option value="admin">Admin</option></Select></Field></div>
      <Submit pending="Sending…">Send invite</Submit>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}

export function CompanyProfileForm({ org, disabled }: { org: Organization; disabled: boolean }) {
  const [state, action] = useActionState(saveCompanyProfile, undefined);
  return (
    <form action={action} className="space-y-6">
      <fieldset disabled={disabled} className="contents">
        <ImageInput current={org.logo_url} name={org.name} label="Logo" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Tagline" hint="One line on what you do"><Input name="tagline" maxLength={160} defaultValue={org.tagline ?? ""} placeholder="Solar installation for homes and farms in Western Kenya" /></Field></div>
          <div className="sm:col-span-2"><Field label="About the company"><Textarea name="about" rows={5} maxLength={3000} defaultValue={org.about ?? ""} placeholder="What you offer, who you serve, and what makes you different." /></Field></div>
          <Field label="Business email"><Input name="email" type="email" defaultValue={org.email ?? ""} /></Field>
          <Field label="Business phone"><Input name="phone" inputMode="tel" defaultValue={org.phone ?? ""} /></Field>
          <div className="sm:col-span-2"><Field label="Office address"><Input name="address" defaultValue={org.address ?? ""} placeholder="Building, street, town" /></Field></div>
          <Field label="Year founded"><Input name="founded_year" type="number" min={1900} max={2100} defaultValue={org.founded_year ?? ""} /></Field>
          <Field label="Team size"><Select name="team_size" defaultValue={org.team_size ?? ""}><option value="">—</option>{["1–5", "6–20", "21–50", "51–200", "200+"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Social links</p>
          <SocialFields value={org.socials} />
        </div>
        <div className="space-y-3">
          <FormMessage state={state} />
          {!disabled ? <Submit>Save profile</Submit> : <p className="text-sm text-muted">Only owners and admins can edit.</p>}
        </div>
      </fieldset>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteMyAccount, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-ink/80">This deletes your login and your personal details. If you are the only owner of a company, that company and its documents are deleted too. It can&apos;t be undone.</p>
      <Field label="Type DELETE to confirm"><Input name="confirm" autoComplete="off" /></Field>
      <FormMessage state={state} />
      <Submit variant="danger" pending="Deleting…">Delete my account</Submit>
    </form>
  );
}

export function DeleteCompanyForm({ name }: { name: string }) {
  const [state, action] = useActionState(deleteMyCompany, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-ink/80">This removes {name}, its profile, documents, applications and verification from Dhow. Your login stays, so you can create a new company later. It can&apos;t be undone.</p>
      <Field label={`Type ${name} to confirm`}><Input name="confirm" autoComplete="off" /></Field>
      <FormMessage state={state} />
      <Submit variant="danger" pending="Deleting…">Delete company</Submit>
    </form>
  );
}

const KIND_CHOICES = [
  { key: "grant", label: "Grants and funding" },
  { key: "tender", label: "Tenders and RFPs" },
  { key: "program", label: "Programmes and accelerators" },
  { key: "event", label: "Events and trade missions" },
];
const TOPIC_CHOICES = ["Agriculture", "Climate & energy", "Health", "Education", "Technology", "Finance", "Creative", "Women & youth", "Social impact"];

function Chip({ name, value, label, checked, disabled }: { name: string; value: string; label: string; checked: boolean; disabled: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} disabled={disabled} className="peer sr-only" />
      <span className="inline-flex items-center rounded-full border border-line bg-white px-3.5 py-2 text-sm transition peer-checked:border-navy-900 peer-checked:bg-navy-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-navy-300">{label}</span>
    </label>
  );
}

export function InterestsForm({ org, disabled }: { org: Organization; disabled: boolean }) {
  const [state, action] = useActionState(saveInterests, undefined);
  return (
    <form action={action} className="space-y-5">
      <Field label="Your sector">
        <Select name="sector" defaultValue={org.sector ?? ""} disabled={disabled}><option value="">Choose your sector</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</Select>
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">Show me</p>
        <div className="flex flex-wrap gap-2">{KIND_CHOICES.map((k) => <Chip key={k.key} name="kinds" value={k.key} label={k.label} checked={(org.interest_kinds ?? []).includes(k.key)} disabled={disabled} />)}</div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Topics I care about</p>
        <div className="flex flex-wrap gap-2">{TOPIC_CHOICES.map((t) => <Chip key={t} name="topics" value={t} label={t} checked={(org.interest_sectors ?? []).includes(t)} disabled={disabled} />)}</div>
      </div>
      <FormMessage state={state} />
      {!disabled ? <Submit>Save what we look for</Submit> : <p className="text-sm text-muted">Only owners and admins can change this.</p>}
    </form>
  );
}

const EMAIL_CHOICES = [
  { key: "opportunities", label: "New opportunities for us", sub: "A short weekly email with the best new fits for your company." },
  { key: "deadlines", label: "Deadline reminders", sub: "When an application you started is about to close." },
  { key: "updates", label: "Verification and payment updates", sub: "Results of checks, receipts and changes to your account." },
] as const;

export function EmailChoicesForm({ prefs }: { prefs: Record<string, boolean> }) {
  const [state, action] = useActionState(saveEmailChoices, undefined);
  return (
    <form action={action} className="space-y-1">
      {EMAIL_CHOICES.map((c) => (
        <label key={c.key} className="flex cursor-pointer items-start gap-3 rounded-2xl px-1 py-3 hover:bg-sunken/50">
          <input type="checkbox" name={c.key} defaultChecked={prefs[c.key] !== false} className="peer sr-only" />
          <span aria-hidden className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-line transition peer-checked:bg-green after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
          <span><span className="block text-sm font-medium">{c.label}</span><span className="block text-sm text-muted">{c.sub}</span></span>
        </label>
      ))}
      <p className="px-1 pb-2 text-xs text-faint">Sign-in, security and legal emails are always sent.</p>
      <FormMessage state={state} />
      <Submit variant="outline">Save email choices</Submit>
    </form>
  );
}
