"use client";
import { useActionState } from "react";
import { Building2 } from "lucide-react";
import { createOrganization } from "@/actions/member";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { SECTORS } from "@/lib/types";

const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia", "United Kingdom", "United States", "United Arab Emirates", "India", "China", "Other"];

/** Only what we need to set up the workspace. Registration details come later, when the company wants to be verified. */
export function OnboardingForm() {
  const [state, action] = useActionState(createOrganization, undefined);
  return (
    <form action={action} className="mt-7 space-y-4">
      <Field label="Company name">
        <label className="relative block">
          <Building2 className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="name" required autoFocus autoComplete="organization" placeholder="e.g. Acme Kenya Ltd" className="field pl-11" />
        </label>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Registered in">
          <Select name="country" defaultValue="Kenya">{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <Field label="Sector" hint="Optional">
          <Select name="sector" defaultValue=""><option value="">Choose later</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</Select>
        </Field>
      </div>
      <FormMessage state={state} />
      <Submit variant="accent" className="w-full py-3" pending="Setting up…">Continue</Submit>
    </form>
  );
}
