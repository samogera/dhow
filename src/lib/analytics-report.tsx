import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { WORDMARK_NAVY_PNG, WORDMARK_RATIO } from "@/lib/brand-logo";
import { pdfText } from "@/lib/invoice-pdf";
import type { AnalyticsSummary, Row } from "@/lib/analytics";

const NAVY = "#00395f", MUTED = "#6b7785", LINE = "#e3e8ed", SOFT = "#f4f7f9", MINT = "#63b8a8", BAR = "#2a6593";

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 56, paddingHorizontal: 44, fontSize: 9, color: "#0d1c29", fontFamily: "Helvetica" },
  band: { flexDirection: "row", height: 5, marginHorizontal: -44 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 32 },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "right", lineHeight: 1.2 },
  sub: { color: MUTED, textAlign: "right", marginTop: 4 },
  h2: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 24, marginBottom: 8 },
  kpis: { flexDirection: "row", flexWrap: "wrap", marginTop: 24, marginHorizontal: -4 },
  kpi: { width: "33.33%", padding: 4 },
  kpiBox: { backgroundColor: SOFT, borderRadius: 6, padding: 10 },
  kpiLabel: { lineHeight: 1.3, fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 3, lineHeight: 1.2 },
  kpiNote: { color: MUTED, fontSize: 8 },
  grid: { flexDirection: "row", marginHorizontal: -8 },
  col: { flex: 1, paddingHorizontal: 8 },
  barRow: { marginBottom: 6 },
  barTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  track: { height: 4, backgroundColor: SOFT, borderRadius: 2 },
  th: { flexDirection: "row", borderBottom: `1 solid ${NAVY}`, paddingBottom: 4, color: MUTED, fontSize: 7.5, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottom: `0.5 solid ${LINE}`, paddingVertical: 5 },
  foot: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTED },
});

function Bars({ rows, empty }: { rows: Row[]; empty: string }) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!total) return <Text style={{ color: MUTED }}>{empty}</Text>;
  return (
    <View>
      {rows.map((r) => (
        <View key={r.label} style={s.barRow}>
          <View style={s.barTop}><Text>{pdfText(r.label)}</Text><Text>{r.value}  <Text style={{ color: MUTED }}>{Math.round((r.value / total) * 100)}%</Text></Text></View>
          <View style={s.track}><View style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, height: 4, backgroundColor: BAR, borderRadius: 2 }} /></View>
        </View>
      ))}
    </View>
  );
}

function Months({ data, field }: { data: AnalyticsSummary["months"]; field: "members" | "applications" }) {
  const max = Math.max(1, ...data.map((d) => d[field]));
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 70, borderBottom: `0.75 solid ${LINE}` }}>
        {data.map((d, i) => (
          <View key={d.label} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 70 }}>
            {d[field] ? <Text style={{ fontSize: 6.5, color: MUTED, marginBottom: 2 }}>{d[field]}</Text> : null}
            <View style={{ width: "55%", height: `${(d[field] / max) * 80}%`, backgroundColor: i === data.length - 1 ? NAVY : BAR, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", marginTop: 3 }}>{data.map((d) => <Text key={d.label} style={{ flex: 1, textAlign: "center", fontSize: 6, color: MUTED }}>{d.label.split(" ")[0]}</Text>)}</View>
    </View>
  );
}

function Report({ a }: { a: AnalyticsSummary }) {
  return (
    <Document title={`Dhow Partners analytics - ${a.generated}`} author="Dhow Partners">
      <Page size="A4" style={s.page}>
        <View style={s.band}><View style={{ flex: 5, backgroundColor: NAVY }} /><View style={{ flex: 1, backgroundColor: MINT }} /></View>
        <View style={s.head}>
          <Image src={WORDMARK_NAVY_PNG} style={{ height: 18, width: 18 * WORDMARK_RATIO }} />
          <View><Text style={s.h1}>Members report</Text><Text style={s.sub}>As at {a.generated}</Text></View>
        </View>

        <View style={s.kpis}>
          {a.kpis.map((k) => (
            <View key={k.label} style={s.kpi}><View style={s.kpiBox}><Text style={s.kpiLabel}>{k.label}</Text><Text style={s.kpiValue}>{k.value}</Text><Text style={s.kpiNote}>{k.note}</Text></View></View>
          ))}
        </View>

        <View style={s.grid}>
          <View style={s.col}><Text style={s.h2}>New member companies, last 12 months</Text><Months data={a.months} field="members" /></View>
          <View style={s.col}><Text style={s.h2}>Applications, last 12 months</Text><Months data={a.months} field="applications" /></View>
        </View>

        <View style={s.grid}>
          <View style={s.col}><Text style={s.h2}>Verification</Text><Bars rows={a.verification} empty="No companies yet." /></View>
          <View style={s.col}><Text style={s.h2}>Plans</Text><Bars rows={a.plans} empty="No companies yet." /></View>
          <View style={s.col}><Text style={s.h2}>Sectors</Text><Bars rows={a.sectors} empty="No companies yet." /></View>
        </View>

        <Text style={s.h2}>Most applied opportunities</Text>
        {a.top.length ? (
          <View>
            <View style={s.th}><Text style={{ flex: 6 }}>Opportunity</Text><Text style={{ flex: 2 }}>Kind</Text><Text style={{ flex: 1.4, textAlign: "right" }}>Companies</Text><Text style={{ flex: 1, textAlign: "right" }}>Won</Text></View>
            {a.top.map((t, i) => (
              <View key={i} style={s.tr} wrap={false}><Text style={{ flex: 6, paddingRight: 8 }}>{pdfText(t.title)}</Text><Text style={{ flex: 2, color: MUTED }}>{t.kind}</Text><Text style={{ flex: 1.4, textAlign: "right" }}>{t.companies}</Text><Text style={{ flex: 1, textAlign: "right" }}>{t.won}</Text></View>
            ))}
          </View>
        ) : <Text style={{ color: MUTED }}>No applications yet.</Text>}

        {a.notApplied.length ? (
          <View>
            <Text style={s.h2}>Companies that haven&apos;t applied yet ({a.notApplied.length})</Text>
            <View style={s.th}><Text style={{ flex: 5 }}>Company</Text><Text style={{ flex: 2 }}>Joined</Text><Text style={{ flex: 2 }}>Verification</Text></View>
            {a.notApplied.slice(0, 40).map((o, i) => (
              <View key={i} style={s.tr} wrap={false}><Text style={{ flex: 5 }}>{pdfText(o.name)}</Text><Text style={{ flex: 2, color: MUTED }}>{o.joined}</Text><Text style={{ flex: 2, color: MUTED }}>{o.verification}</Text></View>
            ))}
          </View>
        ) : null}

        <View style={s.foot} fixed>
          <Text>Dhow Partners   |   Internal report</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderAnalyticsPdf(a: AnalyticsSummary) {
  return renderToBuffer(<Report a={a} />);
}
