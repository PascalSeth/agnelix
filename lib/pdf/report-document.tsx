import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

interface ReportDocumentProps {
  agencyName: string | null
  agencyLogo: string | null
  brandColor: string | null
  campaignName: string
  periodStart: Date
  periodEnd: Date
  metrics: Record<string, number | string>
  narrative: string | null
  generatedAt: Date
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function formatLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export function ReportDocument({
  agencyName,
  agencyLogo,
  brandColor,
  campaignName,
  periodStart,
  periodEnd,
  metrics,
  narrative,
  generatedAt,
}: ReportDocumentProps) {
  const accent = brandColor || "#10b981"
  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: `2px solid ${accent}`, paddingBottom: 16 },
    logo: { width: 48, height: 48, objectFit: "contain" },
    agencyName: { fontSize: 16, fontWeight: 700, color: accent },
    title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
    period: { fontSize: 11, color: "#666", marginBottom: 20 },
    sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 10, color: accent, textTransform: "uppercase", letterSpacing: 1 },
    metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    metricBox: { width: "31%", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 6, padding: 10, marginBottom: 8 },
    metricValue: { fontSize: 16, fontWeight: 700 },
    metricLabel: { fontSize: 9, color: "#777", marginTop: 2, textTransform: "uppercase" },
    narrative: { fontSize: 11, lineHeight: 1.6, color: "#333" },
    footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#999", borderTop: "1px solid #e5e5e5", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{campaignName}</Text>
            <Text style={styles.period}>
              Performance Report · {formatDate(periodStart)} – {formatDate(periodEnd)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {agencyLogo ? <Image src={agencyLogo} style={styles.logo} /> : null}
            {agencyName ? <Text style={styles.agencyName}>{agencyName}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          {Object.entries(metrics).map(([key, value]) => (
            <View key={key} style={styles.metricBox}>
              <Text style={styles.metricValue}>{String(value)}</Text>
              <Text style={styles.metricLabel}>{formatLabel(key)}</Text>
            </View>
          ))}
        </View>

        {narrative ? (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.narrative}>{narrative}</Text>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text>{agencyName || "LeadGenZ"}</Text>
          <Text>Generated {formatDate(generatedAt)}</Text>
        </View>
      </Page>
    </Document>
  )
}
