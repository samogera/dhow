import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { WORDMARK_NAVY_PNG, WORDMARK_RATIO } from "@/lib/brand-logo";
import type { Issuer } from "@/lib/dhow-profile";

export interface InvoiceForPdf {
  number: string;
  issue_date: string;
  due_date: string;
  vat_rate: number;
  subtotal_kes: number;
  vat_kes: number;
  total_kes: number;
  paid_kes: number;
  notes: string | null;
  client: { name: string; email: string | null; country: string | null };
  items: { description: string; quantity: number; unit_price_kes: number }[];
}

const money = (n: number) => `KSh ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
const d = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const NAVY = "#00395f", INK = "#0d1c29", MUTED = "#6b7785", LINE = "#e3e8ed", SOFT = "#f4f7f9", MINT = "#63b8a8";

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 72, paddingHorizontal: 48, fontSize: 9.5, color: INK, fontFamily: "Helvetica", lineHeight: 1.4 },
  band: { flexDirection: "row", height: 5, marginHorizontal: -48 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 36 },
  kicker: { fontSize: 8, letterSpacing: 2.4, color: MUTED, textAlign: "right" },
  number: { fontSize: 22, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "right", marginTop: 2 },
  parties: { flexDirection: "row", marginTop: 34 },
  party: { flex: 1, paddingRight: 24 },
  label: { fontSize: 7.5, color: MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 2 },
  muted: { color: MUTED },
  meta: { flexDirection: "row", marginTop: 26, backgroundColor: SOFT, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
  metaCell: { flex: 1 },
  metaDue: { flex: 1.3, alignItems: "flex-end" },
  metaValue: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 1 },
  dueValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 1 },
  th: { flexDirection: "row", marginTop: 28, paddingBottom: 7, borderBottom: `1.2 solid ${NAVY}` },
  thText: { fontSize: 7.5, color: MUTED, letterSpacing: 1, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 9, borderBottom: `0.75 solid ${LINE}` },
  c1: { flex: 5, paddingRight: 12 }, c2: { flex: 1, textAlign: "right" }, c3: { flex: 2, textAlign: "right" }, c4: { flex: 2, textAlign: "right" },
  totals: { marginTop: 14, marginLeft: "auto", width: 230 },
  tline: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: NAVY, borderRadius: 6, color: "#ffffff" },
  payTitle: { fontSize: 7.5, color: MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 34, marginBottom: 8 },
  payRow: { flexDirection: "row", marginHorizontal: -6 },
  payCard: { flex: 1, border: `0.75 solid ${LINE}`, borderRadius: 8, padding: 14, marginHorizontal: 6 },
  payHead: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 8, color: NAVY },
  kv: { flexDirection: "row", paddingVertical: 1.5 },
  k: { width: 78, color: MUTED }, v: { flex: 1, fontFamily: "Helvetica-Bold" },
  note: { marginTop: 18, color: MUTED },
  foot: { position: "absolute", bottom: 28, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTop: `0.75 solid ${LINE}`, paddingTop: 10 },
  thanks: { fontSize: 12, fontFamily: "Helvetica-Bold", color: NAVY },
});

function KV({ k, v }: { k: string; v: string | null | undefined }) {
  return v ? <View style={s.kv}><Text style={s.k}>{k}</Text><Text style={s.v}>{v}</Text></View> : null;
}

function InvoiceDoc({ inv, issuer, payUrl }: { inv: InvoiceForPdf; issuer: Issuer; payUrl?: string }) {
  const balance = inv.total_kes - inv.paid_kes;
  const hasBank = issuer.bank.account_no;
  const hasPaybill = issuer.paybill.number;
  return (
    <Document title={`Invoice ${inv.number} · ${issuer.trading}`} author={issuer.name}>
      <Page size="A4" style={s.page}>
        <View style={s.band}><View style={{ flex: 5, backgroundColor: NAVY }} /><View style={{ flex: 1, backgroundColor: MINT }} /></View>

        <View style={s.head}>
          <Image src={WORDMARK_NAVY_PNG} style={{ height: 20, width: 20 * WORDMARK_RATIO }} />
          <View><Text style={s.kicker}>INVOICE</Text><Text style={s.number}>{inv.number}</Text></View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>From</Text>
            <Text style={s.strong}>{issuer.name}</Text>
            {issuer.address ? <Text style={s.muted}>{issuer.address}</Text> : null}
            {issuer.postal ? <Text style={s.muted}>{issuer.postal}</Text> : null}
            {issuer.email ? <Text style={s.muted}>{issuer.email}</Text> : null}
            {issuer.phone ? <Text style={s.muted}>{issuer.phone}</Text> : null}
            {issuer.kra_pin ? <Text style={s.muted}>KRA PIN {issuer.kra_pin}</Text> : null}
          </View>
          <View style={s.party}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.strong}>{inv.client.name}</Text>
            {inv.client.email ? <Text style={s.muted}>{inv.client.email}</Text> : null}
            {inv.client.country ? <Text style={s.muted}>{inv.client.country}</Text> : null}
          </View>
        </View>

        <View style={s.meta}>
          <View style={s.metaCell}><Text style={s.label}>Invoice no.</Text><Text style={s.metaValue}>{inv.number}</Text></View>
          <View style={s.metaCell}><Text style={s.label}>Issued</Text><Text style={s.metaValue}>{d(inv.issue_date)}</Text></View>
          <View style={s.metaCell}><Text style={s.label}>Due</Text><Text style={s.metaValue}>{d(inv.due_date)}</Text></View>
          <View style={s.metaDue}><Text style={s.label}>Amount due</Text><Text style={s.dueValue}>{money(balance)}</Text></View>
        </View>

        <View style={s.th}>
          <Text style={[s.thText, s.c1]}>Description</Text><Text style={[s.thText, s.c2]}>Qty</Text><Text style={[s.thText, s.c3]}>Unit price</Text><Text style={[s.thText, s.c4]}>Amount</Text>
        </View>
        {inv.items.map((it, i) => (
          <View style={s.tr} key={i} wrap={false}>
            <Text style={s.c1}>{it.description}</Text>
            <Text style={s.c2}>{it.quantity}</Text>
            <Text style={s.c3}>{money(it.unit_price_kes)}</Text>
            <Text style={s.c4}>{money(it.quantity * it.unit_price_kes)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.tline}><Text style={s.muted}>Subtotal</Text><Text>{money(inv.subtotal_kes)}</Text></View>
          {inv.vat_rate > 0 ? <View style={s.tline}><Text style={s.muted}>VAT {inv.vat_rate}%</Text><Text>{money(inv.vat_kes)}</Text></View> : null}
          <View style={s.tline}><Text style={s.muted}>Total</Text><Text>{money(inv.total_kes)}</Text></View>
          {inv.paid_kes > 0 ? <View style={s.tline}><Text style={s.muted}>Paid</Text><Text>- {money(inv.paid_kes)}</Text></View> : null}
          <View style={s.grand}><Text style={{ fontFamily: "Helvetica-Bold" }}>Amount due</Text><Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>{money(balance)}</Text></View>
        </View>

        {hasBank || hasPaybill ? (
          <View wrap={false}>
            <Text style={s.payTitle}>How to pay</Text>
            <View style={s.payRow}>
              {hasBank ? (
                <View style={s.payCard}>
                  <Text style={s.payHead}>Bank transfer</Text>
                  <KV k="Bank" v={issuer.bank.name} />
                  <KV k="Account name" v={issuer.bank.account_name} />
                  <KV k="Account no." v={issuer.bank.account_no} />
                  <KV k="Branch" v={issuer.bank.branch} />
                  <KV k="SWIFT" v={issuer.bank.swift} />
                </View>
              ) : null}
              {hasPaybill ? (
                <View style={s.payCard}>
                  <Text style={s.payHead}>M-Pesa or Airtel Money</Text>
                  <KV k="Paybill" v={issuer.paybill.number} />
                  <KV k="Account no." v={issuer.paybill.account} />
                  <KV k="Amount" v={money(balance)} />
                  <Text style={[s.muted, { marginTop: 6, fontSize: 8 }]}>M-Pesa: Lipa na M-Pesa, then Paybill. Airtel: dial *334#.</Text>
                </View>
              ) : null}
            </View>
            <Text style={s.note}>Reference: invoice {inv.number}.{issuer.terms ? ` ${issuer.terms}` : ""}{payUrl ? `  Pay online: ${payUrl}` : ""}</Text>
          </View>
        ) : null}

        {inv.notes ? <Text style={s.note}>{inv.notes}</Text> : null}

        <View style={s.foot} fixed>
          <Text style={s.thanks}>Thank you.</Text>
          <Text style={[s.muted, { fontSize: 8, textAlign: "right" }]}>{[issuer.name, issuer.website, issuer.email].filter(Boolean).join("  ·  ")}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(inv: InvoiceForPdf, issuer: Issuer, payUrl?: string) {
  return renderToBuffer(<InvoiceDoc inv={inv} issuer={issuer} payUrl={payUrl} />);
}
