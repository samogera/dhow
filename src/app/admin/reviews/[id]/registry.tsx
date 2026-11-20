import { Check, X } from "lucide-react";
import { normName } from "@/lib/kyb";

type Person = { name?: string; type?: string; id_type?: string; nationality?: string; shares?: unknown };

/** A readable summary of what the business registry returned (Dojah or Smile ID), with the raw reply tucked away. */
export function RegistryResult({ details, companyName, registrationNumber }: { details: Record<string, unknown>; companyName: string; registrationNumber: string | null }) {
  const info = (details.company_information ?? details) as Record<string, unknown>;
  const name = String(info.business_name ?? info.legal_name ?? "");
  const reg = String(info.registration_number ?? "");
  const status = String(info.status ?? "");
  const people = ((details.partners ?? details.directors ?? []) as Person[]).filter((p) => p?.name);
  if (!name && !status) return <RawReply details={details} />;

  const nameOk = Boolean(name) && normName(name) === normName(companyName);
  const statusOk = /registered|active|live/i.test(status);
  const row = (label: string, value: string, ok?: boolean) => (
    <div className="flex items-start justify-between gap-4 border-t border-line py-2.5 first:border-t-0">
      <dt className="text-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-right font-medium">
        {value || "—"}
        {ok === undefined ? null : ok ? <Check className="size-4 text-good" aria-label="Matches" /> : <X className="size-4 text-bad" aria-label="Doesn't match" />}
      </dd>
    </div>
  );

  return (
    <div className="mt-4 space-y-4 text-sm">
      <dl className="rounded-2xl bg-sunken px-4 py-1.5">
        {row("Registered name", name, nameOk)}
        {row("Name on profile", companyName)}
        {row("Registration no.", reg || registrationNumber || "")}
        {row("Status", status ? status[0].toUpperCase() + status.slice(1) : "", statusOk)}
        {info.registration_date ? row("Registered on", String(info.registration_date)) : null}
        {info.physical_address || info.address ? row("Address", String(info.physical_address ?? info.address)) : null}
      </dl>
      {people.length ? (
        <div>
          <p className="label mb-2">Directors and shareholders on record</p>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {people.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted">{String(p.type ?? "").replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <RawReply details={details} />
    </div>
  );
}

function RawReply({ details }: { details: Record<string, unknown> }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer text-muted hover:text-ink">Full registry reply</summary>
      <pre className="mt-2 max-h-64 overflow-auto rounded-2xl bg-sunken p-3">{JSON.stringify(details, null, 2)}</pre>
    </details>
  );
}
