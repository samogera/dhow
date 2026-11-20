"use client";
import { useActionState } from "react";
import { inviteMember, updateOrganization, updateProfile } from "@/actions/member";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Select } from "@/components/ui";
import { COUNTRIES, SECTORS, type Organization } from "@/lib/types";

export function CompanyForm({ org, disabled }: { org: Organization; disabled: boolean }) {
  const [state, action] = useActionState(updateOrganization, undefined);
  const locked = org.verification_status === "verified";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <fieldset disabled={disabled} className="contents">
        <div className="sm:col-span-2"><Field label="Company name"><Input name="name" defaultValue={org.name} required /></Field></div>
        <Field label="Country">
          <Select name="country" defaultValue={org.country}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <Field label="Sector">
          <Select name="sector" defaultValue={org.sector ?? ""}><option value="">—</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</Select>
        </Field>
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
