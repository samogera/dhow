"use client";
import { useActionState } from "react";
import { createOrganization } from "@/actions/member";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Select } from "@/components/ui";
import { SECTORS } from "@/lib/types";


export function OnboardingForm() {
  const [state, action] = useActionState(createOrganization, undefined);
  return (
    <form action={action} className="mt-8 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Company name"><Input name="name" required placeholder="Acme Kenya Ltd" /></Field></div>
      <Field label="Country of registration">
        <Select name="country" defaultValue="Kenya">
          {["Kenya", "Uganda", "Tanzania", "Rwanda", "United Kingdom", "United States", "United Arab Emirates", "India", "China", "Other"].map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Sector">
        <Select name="sector" defaultValue="">
          <option value="" disabled>Choose a sector</option>
          {SECTORS.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </Field>
      <Field label="BRS registration number" hint="Optional now, needed to get verified"><Input name="brs_number" placeholder="PVT-AB1CD2EF" /></Field>
      <Field label="Company KRA PIN" hint="Stored encrypted"><Input name="kra_pin" placeholder="P051234567X" /></Field>
      <div className="sm:col-span-2"><Field label="Website"><Input name="website" placeholder="acme.co.ke" /></Field></div>
      <div className="sm:col-span-2 space-y-3">
        <FormMessage state={state} />
        <Submit className="w-full py-3" pending="Creating…">Create company</Submit>
      </div>
    </form>
  );
}
