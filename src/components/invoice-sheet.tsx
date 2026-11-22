import { cn, day, kes } from "@/lib/format";

export type SheetIssuer = {
  name: string; address: string | null; postal: string | null; email: string | null; phone: string | null; website: string | null; kra_pin: string | null;
  bank: { name: string | null; account_name: string | null; account_no: string | null; branch: string | null; swift: string | null };
  paybill: { number: string | null; account: string | null };
  terms: string | null;
};
export type SheetLine = { description: string; quantity: number; unit_price_kes: number };


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
      <div className="p-6 sm:p-10">
        <header className="flex items-center justify-between gap-4">
          <img src="/brand/wordmark-navy.png" alt="Dhow Partners" className="h-5 w-auto sm:h-6" />
          <p className={cn("text-lg font-semibold tracking-tight text-navy-900 sm:text-xl", !number && placeholder)}>Invoice {number ?? "No."}</p>
        </header>

        <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-[1fr_7rem_7rem]">
          <div className="col-span-2 sm:col-span-1">
            <p className="label mb-1">Billed to</p>
            <p className={cn("text-[15px] font-semibold", !client && placeholder)}>{client?.name ?? "Client name"}</p>
            {client?.email ? <p className="text-muted">{client.email}</p> : null}
          </div>
          <div><p className="label mb-1">Issued</p><p>{issue ? day(issue) : "—"}</p></div>
          <div><p className="label mb-1">Due</p><p>{due ? day(due) : "—"}</p></div>
        </div>

        <div className="mt-9 overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-navy-900 text-left text-[10px] tracking-wider text-muted uppercase">
                <th className="pb-2 font-medium">Description</th><th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Price</th><th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-3 pr-3">{l.description || <span className={placeholder}>Describe the service</span>}</td>
                  <td className="num py-3 text-right">{l.quantity}</td>
                  <td className="num py-3 text-right">{kes(l.unit_price_kes)}</td>
                  <td className="num py-3 text-right">{kes(l.quantity * l.unit_price_kes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-4 ml-auto w-full max-w-64 space-y-1">
          <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd className="num">{kes(subtotal)}</dd></div>
          {vatRate > 0 ? <div className="flex justify-between text-muted"><dt>VAT {vatRate}%</dt><dd className="num">{kes(vat)}</dd></div> : null}
          {paid > 0 ? <div className="flex justify-between text-muted"><dt>Paid</dt><dd className="num">− {kes(paid)}</dd></div> : null}
          <div className="!mt-2 flex items-baseline justify-between border-t border-navy-900 pt-2"><dt className="font-semibold">Amount due</dt><dd className="num text-lg font-semibold text-navy-900">{kes(balance)}</dd></div>
        </dl>

        {issuer.bank.account_no || issuer.paybill.number ? (
          <section className="mt-10 grid gap-5 border-t border-line pt-5 sm:grid-cols-3">
            {issuer.bank.account_no ? (
              <div>
                <p className="label mb-1">Bank transfer</p>
                {issuer.bank.name ? <p>{issuer.bank.name}</p> : null}
                {issuer.bank.account_name ? <p>{issuer.bank.account_name}</p> : null}
                <p className="num font-semibold">{issuer.bank.account_no}</p>
              </div>
            ) : null}
            {issuer.paybill.number ? (
              <div>
                <p className="label mb-1">M-Pesa or Airtel Money</p>
                <p>Paybill <span className="num font-semibold">{issuer.paybill.number}</span></p>
                <p>Account <span className="num font-semibold">{issuer.paybill.account}</span></p>
              </div>
            ) : null}
            <div><p className="label mb-1">Reference</p><p>Invoice {number ?? "number"}</p></div>
          </section>
        ) : null}

        {notes ? <p className="mt-6 text-xs whitespace-pre-line text-muted">{notes}</p> : null}

        <footer className="mt-10 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] text-muted">
          <span>{issuer.name}{issuer.kra_pin ? ` · KRA PIN ${issuer.kra_pin}` : ""}</span>
          <span>{[issuer.email, issuer.phone, issuer.website].filter(Boolean).join(" · ")}</span>
        </footer>
      </div>
      {draft ? <span className="absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">Draft preview</span> : null}
    </article>
  );
}
