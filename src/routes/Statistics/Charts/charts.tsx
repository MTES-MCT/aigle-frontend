import {
    DdtmActivityControlStatusPeriod,
    DdtmActivityCountPeriod,
    DdtmActivityPeriodTier,
} from '@/models/ddtm-activity';
import { DETECTION_CONTROL_STATUSES_COLORS_MAP, DETECTION_CONTROL_STATUSES_NAMES_MAP } from '@/utils/constants';
import { downloadChartPng, toFileSlug } from '@/utils/download';
import { BarChart } from '@mantine/charts';
import { ActionIcon, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import React, { useMemo, useRef } from 'react';
import { ACTIVITY_CHART_SERIES, CONTROL_STATUS_ORDER, formatPeriod } from './activity';
import { useBuildAnimation, whenChartsSettled } from './buildAnimation';
import {
    BAR_PROPS,
    CHART_BAR_CHART_PROPS,
    CHART_CHROME,
    SeriesToggle,
    deploymentMarker,
    makeSelectionShape,
    makeStackedBarProps,
    makeTooltipProps,
    useSeriesToggle,
} from './chartConfig';
import classes from './index.module.scss';
import { REPORT_CHART_ATTRIBUTE } from './report/context';

/**
 * Chart block: title + a PNG export of the rendered chart, for slides and reports. The data
 * attribute is how the PDF generator finds the chart and rasterises it.
 */
const ChartSection: React.FC<{ title: string; fileNameContext?: string; children: React.ReactNode }> = ({
    title,
    fileNameContext,
    children,
}) => {
    const chartRef = useRef<HTMLDivElement>(null);

    return (
        <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap">
                <Text fw={600}>{title}</Text>
                <Tooltip label="Télécharger le graphique (PNG)">
                    <ActionIcon
                        className={classes['no-print']}
                        variant="subtle"
                        size="lg"
                        aria-label="Télécharger le graphique (PNG)"
                        onClick={async () => {
                            // the export serialises the live <svg>: capture only once the
                            // columns have finished growing
                            await whenChartsSettled();

                            if (chartRef.current) {
                                downloadChartPng(
                                    chartRef.current,
                                    `${toFileSlug(`${fileNameContext || ''} ${title}`)}.png`,
                                    fileNameContext ? `${fileNameContext} — ${title}` : title,
                                );
                            }
                        }}
                    >
                        <IconDownload size={18} />
                    </ActionIcon>
                </Tooltip>
            </Group>
            <div ref={chartRef} {...{ [REPORT_CHART_ATTRIBUTE]: title }}>
                {children}
            </div>
        </Stack>
    );
};

/**
 * Stacked tier bars, one column per period. Used both per-user (group detail) and per-group
 * (territory-wide). Hovering a period with no entity (totalCount 0) explains the gap instead
 * of showing zeros — pre-deployment, or a group that did not exist yet.
 *
 * `onPeriodSelect` makes the chart a picker: the whole column band answers the click, not
 * only the painted bars, and the periods left aside fade so the reader keeps the trend.
 */
export const ActivityChart: React.FC<{
    title: string;
    data: DdtmActivityPeriodTier[];
    deploymentPeriod: string | null;
    fileNameContext?: string;
    emptyMessage?: string;
    selectedPeriod?: string | null;
    onPeriodSelect?: (period: string | null) => void;
    /** Lets the parent own which categories are shown, so the detail below can mirror them. */
    seriesToggle?: SeriesToggle;
}> = ({
    title,
    data,
    deploymentPeriod,
    fileNameContext,
    emptyMessage,
    selectedPeriod = null,
    onPeriodSelect,
    seriesToggle,
}) => {
    const noDataLabels = new Set(data.filter((tier) => tier.totalCount === 0).map((tier) => formatPeriod(tier.period)));
    const periods = data.map((tier) => tier.period);
    const selectedIndex = selectedPeriod === null ? -1 : periods.indexOf(selectedPeriod);

    const { hiddenSeries, legendProps } = useSeriesToggle(ACTIVITY_CHART_SERIES, seriesToggle);
    const buildAnimation = useBuildAnimation();

    // A hidden category keeps its bar, zeroed, instead of leaving `series`. Unmounting it
    // left recharts without a previous geometry to interpolate from, so the stack could not
    // animate at all one way and grew out of the middle of its neighbour the other. Zeroed,
    // every bar always has a before and an after, and the whole column morphs as one object.
    //
    // Memoised because recharts keys its animation on the identity of `data`: a fresh array
    // bumps its updateId and replays the animation. The hidden set belongs in the key —
    // that is exactly when the chart SHOULD animate.
    const hiddenKey = [...hiddenSeries].sort().join(',');
    const chartData = useMemo(
        () =>
            data.map((tier) => ({
                period: formatPeriod(tier.period),
                ...Object.fromEntries(
                    ACTIVITY_CHART_SERIES.map(({ name }) => [
                        name,
                        hiddenSeries.has(name) ? 0 : (tier[name as keyof DdtmActivityPeriodTier] as number),
                    ]),
                ),
            })),
        [data, hiddenKey],
    );

    return (
        <ChartSection title={title} fileNameContext={fileNameContext}>
            <BarChart
                {...CHART_CHROME}
                className={onPeriodSelect ? 'chart-clickable' : undefined}
                data={chartData}
                dataKey="period"
                type="stacked"
                series={ACTIVITY_CHART_SERIES}
                withLegend
                legendProps={legendProps}
                tooltipProps={makeTooltipProps(noDataLabels, ACTIVITY_CHART_SERIES, hiddenSeries, emptyMessage)}
                barProps={makeStackedBarProps(chartData, ACTIVITY_CHART_SERIES, buildAnimation, {
                    shape: makeSelectionShape(selectedIndex),
                })}
                barChartProps={{
                    ...CHART_BAR_CHART_PROPS,
                    // Chart-level, not per-bar: the whole column band answers the click, so a
                    // period with no group at all (nothing painted) stays selectable.
                    ...(onPeriodSelect
                        ? {
                              onClick: ({ activeTooltipIndex }) => {
                                  const period = periods[activeTooltipIndex ?? -1];

                                  if (period) {
                                      // clicking the selected period again closes the detail
                                      onPeriodSelect(period === selectedPeriod ? null : period);
                                  }
                              },
                          }
                        : {}),
                }}
            >
                {deploymentMarker(deploymentPeriod, periods)}
            </BarChart>
        </ChartSection>
    );
};

export const ControlStatusChart: React.FC<{
    data: DdtmActivityControlStatusPeriod[];
    deploymentPeriod: string | null;
    noDataLabels: Set<string>;
    fileNameContext: string;
}> = ({ data, deploymentPeriod, noDataLabels, fileNameContext }) => {
    // Only chart the control statuses that actually occurred, reusing the app's status
    // colors and labels so the chart matches the rest of the app.
    const presentStatuses = new Set(data.flatMap((period) => period.counts.map((count) => count.status)));
    const series = CONTROL_STATUS_ORDER.filter((status) => presentStatuses.has(status)).map((status) => ({
        name: status,
        label: DETECTION_CONTROL_STATUSES_NAMES_MAP[status],
        color: DETECTION_CONTROL_STATUSES_COLORS_MAP[status],
    }));

    const { hiddenSeries, legendProps } = useSeriesToggle(series);
    const buildAnimation = useBuildAnimation();

    // see ActivityChart: a hidden status keeps its bar at zero so the stack can morph
    const hiddenKey = [...hiddenSeries].sort().join(',');
    const seriesKey = series.map((item) => item.name).join(',');
    const chartData = useMemo(
        () =>
            data.map((period) => ({
                period: formatPeriod(period.period),
                ...Object.fromEntries(
                    series.map(({ name }) => [
                        name,
                        hiddenSeries.has(name) ? 0 : period.counts.find((count) => count.status === name)?.count ?? 0,
                    ]),
                ),
            })),
        [data, hiddenKey, seriesKey],
    );

    return (
        <ChartSection title="Changements de statut de contrôle par période" fileNameContext={fileNameContext}>
            {series.length ? (
                <BarChart
                    {...CHART_CHROME}
                    data={chartData}
                    dataKey="period"
                    type="stacked"
                    series={series}
                    withLegend
                    legendProps={legendProps}
                    tooltipProps={makeTooltipProps(noDataLabels, series, hiddenSeries)}
                    barProps={makeStackedBarProps(chartData, series, buildAnimation)}
                    barChartProps={CHART_BAR_CHART_PROPS}
                >
                    {deploymentMarker(
                        deploymentPeriod,
                        data.map((period) => period.period),
                    )}
                </BarChart>
            ) : (
                <Text c="dimmed" size="sm">
                    Aucun changement de statut de contrôle sur la période.
                </Text>
            )}
        </ChartSection>
    );
};

export const CountBarChart: React.FC<{
    title: string;
    periods: DdtmActivityCountPeriod[];
    label: string;
    color: string;
    deploymentPeriod: string | null;
    noDataLabels: Set<string>;
    fileNameContext: string;
}> = ({ title, periods, label, color, deploymentPeriod, noDataLabels, fileNameContext }) => {
    const series = [{ name: 'count', label, color }];
    // one bar per period, growing straight from the baseline — no schedule needed
    const { animate } = useBuildAnimation(BAR_PROPS.animationDuration);

    return (
        <ChartSection title={title} fileNameContext={fileNameContext}>
            <BarChart
                {...CHART_CHROME}
                data={periods.map((period) => ({ period: formatPeriod(period.period), count: period.count }))}
                dataKey="period"
                series={series}
                tooltipProps={makeTooltipProps(noDataLabels, series)}
                barProps={{ ...BAR_PROPS, isAnimationActive: animate }}
                barChartProps={CHART_BAR_CHART_PROPS}
            >
                {deploymentMarker(
                    deploymentPeriod,
                    periods.map((period) => period.period),
                )}
            </BarChart>
        </ChartSection>
    );
};
