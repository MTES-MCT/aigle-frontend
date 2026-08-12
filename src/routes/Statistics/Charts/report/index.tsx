import { ddtmActivityEndpoints } from '@/api/endpoints';
import { SortableTableColumn } from '@/components/SortableTable';
import {
    DdtmActivityGranularity,
    DdtmActivitySummary,
    DdtmActivityUser,
    DdtmActivityUserGroup,
    DdtmActivityUserGroupActivity,
} from '@/models/ddtm-activity';
import { chartToPngDataUrl } from '@/utils/download';
import { formatDateOnly } from '@/utils/format';
import { MantineTheme, useMantineTheme } from '@mantine/core';
import { pdf } from '@react-pdf/renderer';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback, useRef, useState } from 'react';
import { whenChartsSettled } from '../buildAnimation';
import { REPORT_CHART_ATTRIBUTE, REPORT_GROUP_SECTION_ATTRIBUTE, ReportScope } from './context';
import ReportDocument, { ReportChart, ReportContent, ReportTable } from './ReportDocument';

/** What the page knows and the report module must not import back from it (cycle). */
export interface ReportSources {
    legend: { label: string; color: string; description: string }[];
    granularityLabels: Record<DdtmActivityGranularity, string>;
    groupColumns: SortableTableColumn<DdtmActivityUserGroup>[];
    userColumns: SortableTableColumn<DdtmActivityUser>[];
}

// 'blue.9' -> '#1864ab'. A PDF has no CSS cascade, so every color has to be resolved to a
// literal before it leaves the page.
const resolveColor = (theme: MantineTheme, color: string) => {
    const [name, shade] = color.split('.');
    return theme.colors[name]?.[Number(shade)] ?? color;
};

const buildTable = <T,>(
    columns: SortableTableColumn<T>[],
    items: T[],
    widths: string[],
    title?: string,
): ReportTable => ({
    title,
    columns: columns.map((column) => column.label),
    widths,
    rows: items.map((item) => columns.map((column) => (column.displayValue ?? column.value)(item))),
    footer: columns.some((column) => column.footer)
        ? columns.map((column) => {
              const footer = column.footer?.(items);
              return typeof footer === 'string' || typeof footer === 'number' ? footer : '';
          })
        : undefined,
});

// Charts come out of the live page as bitmaps: they are the one thing that cannot be
// rebuilt from the data, and rasterising them at the size they already have is what removes
// every reflow the browser print path could not control.
const captureCharts = async (): Promise<{ overview: ReportChart[]; group: ReportChart[] }> => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[${REPORT_CHART_ATTRIBUTE}]`));
    const captured = await Promise.all(
        nodes.map(async (node) => ({
            title: node.getAttribute(REPORT_CHART_ATTRIBUTE) || '',
            src: await chartToPngDataUrl(node),
            inGroupSection: !!node.closest(`[${REPORT_GROUP_SECTION_ATTRIBUTE}]`),
        })),
    );

    const usable = captured.filter((chart): chart is ReportChart & { inGroupSection: boolean } => !!chart.src);

    return {
        overview: usable.filter((chart) => !chart.inGroupSection),
        group: usable.filter((chart) => chart.inGroupSection),
    };
};

const GROUPS_TABLE_WIDTHS = ['30%', '13%', '16%', '13%', '15%', '13%'];
const USERS_TABLE_WIDTHS = ['40%', '22%', '20%', '18%'];

/**
 * Builds the report as a real PDF rather than printing the page. The browser print path
 * cannot be made reliable: WebKit has never implemented block fragmentation for flex or
 * grid containers, so a Mantine dashboard paginates into blank pages and cards whose border
 * prints one page before their content. Rendering through pdfkit gives the same bytes in
 * every browser, real page numbers and a repeated table header.
 */
export const useReportDownload = (sources: ReportSources) => {
    const theme = useMantineTheme();
    const queryClient = useQueryClient();
    const scopeRef = useRef<ReportScope | null>(null);
    const [generating, setGenerating] = useState(false);

    const publishScope = useCallback((scope: Partial<ReportScope>) => {
        scopeRef.current = { ...(scopeRef.current as ReportScope), ...scope };
    }, []);

    const download = useCallback(async () => {
        setGenerating(true);

        try {
            const scope = scopeRef.current;
            const summary = queryClient.getQueryData<DdtmActivitySummary>([ddtmActivityEndpoints.summary]);
            const groups = queryClient.getQueryData<DdtmActivityUserGroup[]>([ddtmActivityEndpoints.userGroups]);
            const groupActivity = scope?.selectedGroupUuid
                ? queryClient.getQueryData<DdtmActivityUserGroupActivity>([
                      ddtmActivityEndpoints.userGroupActivity(scope.selectedGroupUuid),
                      scope.granularity,
                  ])
                : undefined;
            const users = scope?.selectedGroupUuid
                ? queryClient.getQueryData<DdtmActivityUser[]>([
                      ddtmActivityEndpoints.userGroupUsers(scope.selectedGroupUuid),
                  ])
                : undefined;

            // charts are rasterised from the live svg, so let any entrance finish first
            await whenChartsSettled();
            const charts = await captureCharts();

            const content: ReportContent = {
                caption: scope?.caption || '',
                generatedAt: formatDateOnly(format(new Date(), 'yyyy-MM-dd')),
                granularityLabel: scope ? sources.granularityLabels[scope.granularity] : '',
                legend: sources.legend.map((item) => ({ ...item, color: resolveColor(theme, item.color) })),
                stats: summary
                    ? [
                          { label: 'Groupes utilisateurs', value: summary.userGroupsCount },
                          { label: 'Groupes actifs (30 derniers jours)', value: summary.activeUserGroupsCount },
                      ]
                    : [],
                groupsTable: groups?.length ? buildTable(sources.groupColumns, groups, GROUPS_TABLE_WIDTHS) : null,
                overviewCharts: charts.overview,
                periodBreakdown: scope?.periodBreakdown
                    ? {
                          period: scope.periodBreakdown.period,
                          tiers: scope.periodBreakdown.tiersByLabel.map((tier) => ({
                              ...tier,
                              color: resolveColor(theme, tier.color),
                          })),
                      }
                    : null,
                groupTitle: groupActivity ? `Activité du groupe : ${groupActivity.name}` : null,
                groupNote: groupActivity?.deploymentDate
                    ? `Groupe déployé le ${formatDateOnly(groupActivity.deploymentDate)} : avant cette date, le groupe n'utilisait pas AIGLE.`
                    : null,
                groupCharts: charts.group,
                usersTable: users?.length
                    ? buildTable(sources.userColumns, users, USERS_TABLE_WIDTHS, 'Utilisateurs du groupe')
                    : null,
            };

            const blob = await pdf(<ReportDocument content={content} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = `aigle-rapport-activite-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } finally {
            setGenerating(false);
        }
    }, [queryClient, sources, theme]);

    return { generating, download, publishScope };
};
