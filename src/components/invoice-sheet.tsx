import { cn, day, kes } from "@/lib/format";

export type SheetIssuer = {
  name: string; address: string | null; postal: string | null; email: string | null; phone: string | null; website: string | null; kra_pin: string | null;
  bank: { name: string | null; account_name: string | null; account_no: string | null; branch: string | null; swift: string | null };
  paybill: { number: string | null; account: string | null };
  terms: string | null;
};
export type SheetLine = { description: string; quantity: number; unit_price_kes: number };

const Row = ({ k, v }: { k: string; v: string | null | undefined }) =>
  v ? <div className="flex gap-3 py-0.5"><dt className="w-24 shrink-0 text-muted">{k}</dt><dd className="num font-medium break-all">{v}</dd></div> : null;

/** The invoice as clients see it: same layout as the PDF. Empty fields show soft placeholders. */
export function InvoiceSheet({ issuer, number, issue, due, client, lines, vatRate, paid = 0, notes, draft }: {
  issuer: SheetIssuer; number: string | null; issue: string; due: string; client: { name: string; email?: string | null; country?: string | null } | null;
  lines: SheetLine[]; vatRate: number; paid?: number; notes?: string | null; draft?: boolean;
}) {
  const subtotal = lines.reduce((n, l) => n + l.quantity * l.unit_price_kes, 0);
  const vat = Math.round(subtotal * vatRate) / 100;
  const total = subtotal + vat;
  const balance = total - paid;
  const placeholder = "text-faint";
  return (
    <article className="relative overflow-hidden rounded-[1.25rem] bg-white text-[13px] leading-relaxed text-ink shadow-[0_1px_2px_rgba(13,28,41,0.05),0_24px_48px_-28px_rgba(13,28,41,0.35)] ring-1 ring-line">
      <div className="flex h-1.5"><span className="flex-[5] bg-navy-900" /><span className="flex-1 bg-mint" /></div>
      <div className="p-6 sm:p-9">
        <header className="flex items-end justify-between gap-4">
          <img src="/brand/wordmark-navy.png" alt="Dhow Partners" className="h-5 w-auto sm:h-6" />
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-muted">INVOICE</p>
            <p className={cn("text-xl font-semibold tracking-tight text-navy-900 sm:text-2xl", !number && placeholder)}>{number ?? "No. on save"}</p>
          </div>
        </header>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label mb-1.5">From</p>
            <p className="font-semibold">{issuer.name}</p>
            <div className="text-muted">
              {issuer.address ? <p>{issuer.address}</p> : null}
              {issuer.postal ? <p>{issuer.postal}</p> : null}
              {issuer.email ? <p>{issuer.email}</p> : null}
              {issuer.phone ? <p>{issuer.phone}</p> : null}
              {issuer.kra_pin ? <p>KRA PIN {issuer.kra_pin}</p> : null}
            </div>
          </div>
          <div>
            <p className="label mb-1.5">Bill to</p>
            <p className={cn("font-semibold", !client && placeholder)}>{client?.name ?? "Client name"}</p>
            <div className="text-muted">
              {client?.email ? <p>{client.email}</p> : !client ? <p className={placeholder}>client@email.com</p> : null}
              {client?.country ? <p>{client.country}</p> : null}
            </div>
          </div>
        </div>

        <dl className="mt-7 grid grid-cols-2 gap-4 rounded-2xl bg-sunken/80 px-5 py-4 sm:grid-cols-4">
          <div><dt className="label">Invoice no.</dt><dd className={cn("mt-0.5 font-semibold", !number && placeholder)}>{number ?? "—"}</dd></div>
          <div><dt className="label">Issued</dt><dd className="mt-0.5 font-semibold">{issue ? day(issue) : "—"}</dd></div>
          <div><dt className="label">Due</dt><dd className="mt-0.5 font-semibold">{due ? day(due) : "—"}</dd></div>
          <div className="sm:text-right"><dt className="label">Amount due</dt><dd className="num mt-0.5 text-lg font-semibold text-navy-900">{kes(balance)}</dd></div>
        </dl>

        <div className="mt-7 overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b-[1.5px] border-navy-900 text-left text-[10px] tracking-wider text-muted uppercase">
                <th className="pb-2 font-medium">Description</th><th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit price</th><th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-3 pr-3">{l.description || <span className={placeholder}>Describe the service</span>}</td>
                  <td className="num py-3 text-right">{l.quantity}</td>
                  <td className="num py-3 text-right">{kes(l.unit_price_kes)}</td>
                  <td className="num py-3 text-right font-medium">{kes(l.quantity * l.unit_price_kes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-4 ml-auto w-full max-w-72 space-y-1">
          <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd className="num">{kes(subtotal)}</dd></div>
          {vatRate > 0 ? <div className="flex justify-between text-muted"><dt>VAT {vatRate}%</dt><dd className="num">{kes(vat)}</dd></div> : null}
          <div className="flex justify-between text-muted"><dt>Total</dt><dd className="num">{kes(total)}</dd></div>
          {paid > 0 ? <div className="flex justify-between text-muted"><dt>Paid</dt><dd className="num">− {kes(paid)}</dd></div> : null}
          <div className="!mt-3 flex items-center justify-between rounded-xl bg-navy-900 px-4 py-2.5 font-semibold text-white"><dt>Amount due</dt><dd className="num text-base">{kes(balance)}</dd></div>
        </dl>

        {issuer.bank.account_no || issuer.paybill.number ? (
          <section className="mt-9">
            <p className="label mb-2.5">How to pay</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {issuer.bank.account_no ? (
                <div className="rounded-2xl border border-line p-4">
                  <p className="mb-2 font-semibold text-navy-900">Bank transfer</p>
                  <dl><Row k="Bank" v={issuer.bank.name} /><Row k="Account name" v={issuer.bank.account_name} /><Row k="Account no." v={issuer.bank.account_no} /><Row k="Branch" v={issuer.bank.branch} /><Row k="SWIFT" v={issuer.bank.swift} /></dl>
                </div>
              ) : null}
              {issuer.paybill.number ? (
                <div className="rounded-2xl border border-line p-4">
                  <p className="mb-2 font-semibold text-navy-900">M-Pesa or Airtel Money</p>
                  <dl><Row k="Paybill" v={issuer.paybill.number} /><Row k="Account no." v={issuer.paybill.account} /><Row k="Amount" v={kes(balance)} /></dl>
                  <p className="mt-2 text-xs text-muted">M-Pesa: Lipa na M-Pesa, then Paybill. Airtel: dial *334#.</p>
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-muted">Reference: invoice {number ?? "number"}.{issuer.terms ? ` ${issuer.terms}` : ""}</p>
          </section>
        ) : null}

        {notes ? <p className="mt-5 text-xs whitespace-pre-line text-muted">{notes}</p> : null}

        <footer className="mt-9 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-4">
          <p className="text-base font-semibold text-navy-900">Thank you.</p>
          <p className="text-xs text-muted">{[issuer.name, issuer.website, issuer.email].filter(Boolean).join(" · ")}</p>
        </footer>
      </div>
      {draft ? <span className="absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">Draft preview</span> : null}
    </article>
  );
}
