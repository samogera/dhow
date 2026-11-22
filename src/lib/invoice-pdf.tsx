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

/** The built-in PDF fonts only cover Western European characters: swap or drop anything else so a stray emoji can't break the file. */
export function pdfText(v: string | null | undefined): string {
  if (!v) return "";
  return v.normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\u2026/g, "...").replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u00FF\u20AC]/g, "");
}

const money = (n: number) => `KSh ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
const d = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const NAVY = "#00395f", INK = "#0d1c29", MUTED = "#6b7785", LINE = "#e3e8ed", MINT = "#63b8a8";

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 70, paddingHorizontal: 52, fontSize: 10, color: INK, fontFamily: "Helvetica", lineHeight: 1.45 },
  band: { flexDirection: "row", height: 5, marginHorizontal: -52 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 40 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: NAVY },
  label: { fontSize: 7.5, color: MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  row: { flexDirection: "row", marginTop: 40 },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  muted: { color: MUTED },
  th: { flexDirection: "row", marginTop: 36, paddingBottom: 7, borderBottom: `1 solid ${NAVY}` },
  thText: { fontSize: 7.5, color: MUTED, letterSpacing: 1, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 10, borderBottom: `0.75 solid ${LINE}` },
  c1: { flex: 5, paddingRight: 12 }, c2: { flex: 1, textAlign: "right" }, c3: { flex: 2, textAlign: "right" }, c4: { flex: 2, textAlign: "right" },
  totals: { marginTop: 14, marginLeft: "auto", width: 220 },
  tline: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1 solid ${NAVY}` },
  pay: { flexDirection: "row", marginTop: 40, paddingTop: 16, borderTop: `0.75 solid ${LINE}` },
  payCol: { flex: 1, paddingRight: 16 },
  foot: { position: "absolute", bottom: 30, left: 52, right: 52, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: MUTED },
});

function clean<T>(v: T): T {
  if (typeof v === "string") return pdfText(v) as T;
  if (Array.isArray(v)) return v.map(clean) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) as T;
  return v;
}

function InvoiceDoc({ inv: rawInv, issuer: rawIssuer, payUrl }: { inv: InvoiceForPdf; issuer: Issuer; payUrl?: string }) {
  const inv = clean(rawInv), issuer = clean(rawIssuer);
  const balance = inv.total_kes - inv.paid_kes;
  return (
    <Document title={`Invoice ${inv.number} - ${issuer.trading}`} author={issuer.name}>
      <Page size="A4" style={s.page}>
        <View style={s.band}><View style={{ flex: 5, backgroundColor: NAVY }} /><View style={{ flex: 1, backgroundColor: MINT }} /></View>

        <View style={s.head}>
          <Image src={WORDMARK_NAVY_PNG} style={{ height: 20, width: 20 * WORDMARK_RATIO }} />
          <Text style={s.title}>Invoice {inv.number}</Text>
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Billed to</Text>
            <Text style={s.strong}>{inv.client.name}</Text>
            {inv.client.email ? <Text style={s.muted}>{inv.client.email}</Text> : null}
          </View>
          <View style={{ width: 110 }}><Text style={s.label}>Issued</Text><Text>{d(inv.issue_date)}</Text></View>
          <View style={{ width: 110 }}><Text style={s.label}>Due</Text><Text>{d(inv.due_date)}</Text></View>
        </View>

        <View style={s.th}>
          <Text style={[s.thText, s.c1]}>Description</Text><Text style={[s.thText, s.c2]}>Qty</Text><Text style={[s.thText, s.c3]}>Price</Text><Text style={[s.thText, s.c4]}>Amount</Text>
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
          {inv.paid_kes > 0 ? <View style={s.tline}><Text style={s.muted}>Paid</Text><Text>- {money(inv.paid_kes)}</Text></View> : null}
          <View style={s.grand}><Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>Amount due</Text><Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13, color: NAVY }}>{money(balance)}</Text></View>
        </View>

        {issuer.bank.account_no || issuer.paybill.number ? (
          <View style={s.pay} wrap={false}>
            {issuer.bank.account_no ? (
              <View style={s.payCol}>
                <Text style={s.label}>Bank transfer</Text>
                {issuer.bank.name ? <Text>{issuer.bank.name}</Text> : null}
                {issuer.bank.account_name ? <Text>{issuer.bank.account_name}</Text> : null}
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{issuer.bank.account_no}</Text>
              </View>
            ) : null}
            {issuer.paybill.number ? (
              <View style={s.payCol}>
                <Text style={s.label}>M-Pesa or Airtel Money</Text>
                <Text>Paybill <Text style={{ fontFamily: "Helvetica-Bold" }}>{issuer.paybill.number}</Text></Text>
                <Text>Account <Text style={{ fontFamily: "Helvetica-Bold" }}>{issuer.paybill.account}</Text></Text>
              </View>
            ) : null}
            <View style={s.payCol}>
              <Text style={s.label}>Reference</Text>
              <Text>Invoice {inv.number}</Text>
              {payUrl ? <Text style={[s.muted, { fontSize: 8, marginTop: 2 }]}>Or pay by card or M-Pesa online: {payUrl}</Text> : null}
            </View>
          </View>
        ) : null}

        {inv.notes ? <Text style={[s.muted, { marginTop: 22 }]}>{inv.notes}</Text> : null}

        <View style={s.foot} fixed>
          <Text>{issuer.name}{issuer.kra_pin ? `   |   KRA PIN ${issuer.kra_pin}` : ""}</Text>
          <Text>{[issuer.email, issuer.phone, issuer.website].filter(Boolean).join("   |   ")}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(inv: InvoiceForPdf, issuer: Issuer, payUrl?: string) {
  return renderToBuffer(<InvoiceDoc inv={inv} issuer={issuer} payUrl={payUrl} />);
}
