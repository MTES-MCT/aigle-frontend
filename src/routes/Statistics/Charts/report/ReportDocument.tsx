import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';

export interface ReportTable {
    title?: string;
    columns: string[];
    /** Column widths as percentages, one per column. */
    widths: string[];
    rows: (string | number | null)[][];
    footer?: (string | number | null)[];
}

export interface ReportChart {
    title: string;
    src: string;
}

export interface ReportContent {
    caption: string;
    generatedAt: string;
    granularityLabel: string;
    legend: { label: string; color: string; description: string }[];
    stats: { label: string; value: number }[];
    groupsTable: ReportTable | null;
    overviewCharts: ReportChart[];
    periodBreakdown: { period: string; tiers: { label: string; color: string; names: string[] }[] } | null;
    groupTitle: string | null;
    groupNote: string | null;
    groupCharts: ReportChart[];
    usersTable: ReportTable | null;
}

// A4 landscape is 842 x 595pt. The header and footer are taken out of flow and repeated on
// every page, so the page padding has to reserve their band.
const styles = StyleSheet.create({
    page: {
        paddingTop: 54,
        paddingBottom: 40,
        paddingHorizontal: 32,
        fontSize: 9,
        color: '#212529',
    },
    header: {
        position: 'absolute',
        top: 22,
        left: 32,
        right: 32,
        paddingBottom: 6,
        borderBottom: '0.5pt solid #dee2e6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    headerTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
    headerCaption: { fontSize: 8, color: '#868e96' },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 32,
        right: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#868e96',
    },

    sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 6 },
    blockTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4 },
    note: { color: '#495057', marginBottom: 4 },

    legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    legendSwatch: { width: 8, height: 8, borderRadius: 2, marginRight: 6 },
    legendLabel: { fontFamily: 'Helvetica-Bold', marginRight: 4 },

    stats: { flexDirection: 'row', marginTop: 8, marginBottom: 4 },
    stat: {
        width: '32%',
        marginRight: 10,
        padding: 8,
        border: '0.5pt solid #dee2e6',
        borderRadius: 4,
    },
    statValue: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
    statLabel: { fontSize: 8, color: '#868e96' },

    tableHeaderRow: {
        flexDirection: 'row',
        borderBottom: '1pt solid #adb5bd',
        paddingBottom: 3,
        marginBottom: 2,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '0.5pt solid #e9ecef',
        paddingVertical: 3,
    },
    tableFooterRow: { flexDirection: 'row', borderTop: '1pt solid #adb5bd', paddingTop: 3 },
    headerCell: { fontFamily: 'Helvetica-Bold', fontSize: 8, paddingRight: 6 },
    cell: { fontSize: 8, paddingRight: 6 },

    chartTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
    // 72% of the text column, so two charts and their titles fit on one landscape page
    chartImage: { width: '72%', height: 'auto' },

    coverTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
    coverCaption: { fontSize: 12, color: '#495057', marginBottom: 2 },
    coverMeta: { fontSize: 9, color: '#868e96' },

    tierBlock: { marginBottom: 6 },
    tierHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    tierNames: { color: '#495057', lineHeight: 1.4 },
});

// minPresenceAhead: a table that would start in the last inch of a page moves to the next
// one instead of leaving its header stranded above a single row.
const Table: React.FC<{ table: ReportTable }> = ({ table }) => (
    <View minPresenceAhead={100}>
        {table.title ? <Text style={styles.blockTitle}>{table.title}</Text> : null}
        {/* `fixed` re-emits the header at the top of every page the table spills onto */}
        <View style={styles.tableHeaderRow} fixed>
            {table.columns.map((column, index) => (
                <Text key={column} style={[styles.headerCell, { width: table.widths[index] }]}>
                    {column}
                </Text>
            ))}
        </View>
        {table.rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow} wrap={false}>
                {row.map((cell, cellIndex) => (
                    <Text key={cellIndex} style={[styles.cell, { width: table.widths[cellIndex] }]}>
                        {cell === null || cell === undefined ? '—' : String(cell)}
                    </Text>
                ))}
            </View>
        ))}
        {table.footer ? (
            <View style={styles.tableFooterRow} wrap={false}>
                {table.footer.map((cell, index) => (
                    <Text key={index} style={[styles.headerCell, { width: table.widths[index] }]}>
                        {cell === null || cell === undefined ? '' : String(cell)}
                    </Text>
                ))}
            </View>
        ) : null}
    </View>
);

// A chart is a bitmap rasterised from the live page, so it never reflows: the one thing the
// browser print path could not guarantee.
const Chart: React.FC<{ chart: ReportChart }> = ({ chart }) => (
    <View style={{ marginTop: 10 }} wrap={false}>
        <Text style={styles.chartTitle}>{chart.title}</Text>
        <Image style={styles.chartImage} src={chart.src} />
    </View>
);

const ReportDocument: React.FC<{ content: ReportContent }> = ({ content }) => (
    <Document title="AIGLE — Rapport d'activité" author="AIGLE">
        <Page size="A4" orientation="landscape" style={styles.page} wrap>
            <View style={styles.header} fixed>
                <Text style={styles.headerTitle}>AIGLE — Rapport d&apos;activité</Text>
                <Text style={styles.headerCaption}>{content.caption}</Text>
            </View>
            <View style={styles.footer} fixed>
                <Text>Édité le {content.generatedAt}</Text>
                <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
            </View>

            <View style={{ marginTop: 20, marginBottom: 10 }}>
                <Text style={styles.coverTitle}>Rapport d&apos;activité</Text>
                <Text style={styles.coverCaption}>{content.caption}</Text>
                <Text style={styles.coverMeta}>
                    Édité le {content.generatedAt} · Granularité : {content.granularityLabel}
                </Text>
            </View>

            <Text style={styles.sectionTitle}>Catégories d&apos;activité</Text>
            {content.legend.map((item) => (
                <View key={item.label} style={styles.legendRow}>
                    <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label} :</Text>
                    <Text>{item.description}</Text>
                </View>
            ))}

            {content.stats.length ? (
                <View style={styles.stats}>
                    {content.stats.map((stat) => (
                        <View key={stat.label} style={styles.stat}>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {content.groupsTable ? (
                <View break>
                    <Text style={styles.sectionTitle}>Groupes utilisateurs</Text>
                    <Table table={content.groupsTable} />
                </View>
            ) : null}

            {content.overviewCharts.length ? (
                <View break>
                    <Text style={styles.sectionTitle}>Activité du territoire</Text>
                    <Text style={styles.note}>Granularité : {content.granularityLabel}</Text>
                    {content.overviewCharts.map((chart) => (
                        <Chart key={chart.title} chart={chart} />
                    ))}
                </View>
            ) : null}

            {content.periodBreakdown ? (
                <View>
                    <Text style={styles.blockTitle}>Groupes utilisateurs — {content.periodBreakdown.period}</Text>
                    {content.periodBreakdown.tiers.map((tier) => (
                        <View key={tier.label} style={styles.tierBlock} wrap={false}>
                            <View style={styles.tierHeader}>
                                <View style={[styles.legendSwatch, { backgroundColor: tier.color }]} />
                                <Text style={styles.legendLabel}>
                                    {tier.label} ({tier.names.length})
                                </Text>
                            </View>
                            <Text style={styles.tierNames}>
                                {tier.names.length ? tier.names.join(' · ') : 'Aucun groupe'}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {content.groupTitle ? (
                <View break>
                    <Text style={styles.sectionTitle}>{content.groupTitle}</Text>
                    {content.groupNote ? <Text style={styles.note}>{content.groupNote}</Text> : null}
                    {content.groupCharts.map((chart) => (
                        <Chart key={chart.title} chart={chart} />
                    ))}
                    {/* its own page: the per-user detail is a section of the report, and
                        letting it start in the last inch of a chart page strands its header */}
                    {content.usersTable ? (
                        <View break>
                            <Table table={content.usersTable} />
                        </View>
                    ) : null}
                </View>
            ) : null}
        </Page>
    </Document>
);

export default ReportDocument;
