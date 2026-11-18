import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { WORDMARK_NAVY_PNG, WORDMARK_RATIO } from "@/lib/brand-logo";

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
const d = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const s = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: "#0d1c29", fontFamily: "Helvetica" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#00395f", letterSpacing: 1.5 },
  title: { fontSize: 26, fontFamily: "Helvetica-Bold", marginTop: 28 },
  muted: { color: "#5d6b78" },
  label: { color: "#5d6b78", fontSize: 8, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  block: { marginTop: 24 },
  th: { flexDirection: "row", borderBottom: "1 solid #e2e7ec", paddingBottom: 6, marginTop: 28, color: "#5d6b78", fontSize: 8, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottom: "1 solid #f0eee9", paddingVertical: 8 },
  c1: { flex: 5 }, c2: { flex: 1, textAlign: "right" }, c3: { flex: 2, textAlign: "right" }, c4: { flex: 2, textAlign: "right" },
  totals: { marginTop: 16, marginLeft: "auto", width: 220 },
  tline: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 6, borderTop: "1 solid #0d1c29", fontFamily: "Helvetica-Bold", fontSize: 12 },
  pay: { marginTop: 36, padding: 14, backgroundColor: "#f3f5f7", borderRadius: 8 },
  foot: { position: "absolute", bottom: 32, left: 48, right: 48, color: "#a3a6a1", fontSize: 8, textAlign: "center" },
});

function InvoiceDoc({ inv }: { inv: InvoiceForPdf }) {
  const balance = inv.total_kes - inv.paid_kes;
  return (
    <Document title={`Invoice ${inv.number}`} author="Dhow Partners">
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <Image src={WORDMARK_NAVY_PNG} style={{ height: 18, width: 18 * WORDMARK_RATIO }} />
          <Text style={s.muted}>dhowpartners.com</Text>
        </View>
        <Text style={s.title}>Invoice {inv.number}</Text>
        <View style={[s.row, s.block]}>
          <View>
            <Text style={s.label}>Billed to</Text>
            <Text>{inv.client.name}</Text>
            {inv.client.email ? <Text style={s.muted}>{inv.client.email}</Text> : null}
            {inv.client.country ? <Text style={s.muted}>{inv.client.country}</Text> : null}
          </View>
          <View>
            <Text style={s.label}>Issued</Text>
            <Text>{d(inv.issue_date)}</Text>
            <Text style={[s.label, { marginTop: 10 }]}>Due</Text>
            <Text>{d(inv.due_date)}</Text>
          </View>
        </View>
        <View style={s.th}>
          <Text style={s.c1}>Item</Text><Text style={s.c2}>Qty</Text><Text style={s.c3}>Unit price</Text><Text style={s.c4}>Amount</Text>
        </View>
        {inv.items.map((it, i) => (
          <View style={s.tr} key={i}>
            <Text style={s.c1}>{it.description}</Text>
            <Text style={s.c2}>{it.quantity}</Text>
            <Text style={s.c3}>{money(it.unit_price_kes)}</Text>
            <Text style={s.c4}>{money(it.quantity * it.unit_price_kes)}</Text>
          </View>
        ))}
        <View style={s.totals}>
          <View style={s.tline}><Text style={s.muted}>Subtotal</Text><Text>{money(inv.subtotal_kes)}</Text></View>
          <View style={s.tline}><Text style={s.muted}>VAT {inv.vat_rate}%</Text><Text>{money(inv.vat_kes)}</Text></View>
          {inv.paid_kes > 0 ? <View style={s.tline}><Text style={s.muted}>Paid</Text><Text>-{money(inv.paid_kes)}</Text></View> : null}
          <View style={s.grand}><Text>Amount due</Text><Text>{money(balance)}</Text></View>
        </View>
        <View style={s.pay}>
          <Text style={s.label}>How to pay</Text>
          <Text>{inv.notes || "Payment details are on the covering email."}</Text>
        </View>
        <Text style={s.foot}>Dhow Partners · Nairobi, Kenya · Thank you for your business.</Text>
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(inv: InvoiceForPdf) {
  return renderToBuffer(<InvoiceDoc inv={inv} />);
}
