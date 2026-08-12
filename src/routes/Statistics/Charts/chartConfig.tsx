import { ChartTooltip } from '@mantine/charts';
import { Paper, Text } from '@mantine/core';
import React, { useState } from 'react';
import { BarProps, Rectangle, ReferenceLine } from 'recharts';
import { ChartSeriesItem, NOT_DEPLOYED_MESSAGE, formatPeriod } from './activity';
import { makeStackSchedule } from './buildAnimation';
import ChartLegendToggle from './ChartLegendToggle';

/**
 * Chrome shared by every chart of the page. The marks carry the ink and the chrome stays
 * recessive: solid hairlines one step off the surface (Mantine dashes them by default) and
 * no tick marks. Charts span the whole card whatever the granularity — sizing them from the
 * period count left half the row empty on the quarterly and semester views — so the bar
 * width is held by maxBarWidth instead and a column is the same width in all three.
 */
export const CHART_CHROME = {
    h: 300,
    strokeDasharray: '0',
    tickLine: 'none',
    gridAxis: 'x',
    gridColor: 'gray.2',
    maxBarWidth: 56,
    yAxisProps: { allowDecimals: false, tickCount: 5, width: 40 },
    xAxisProps: { minTickGap: 8 },
} as const;

// recharts reads barCategoryGap as the padding on EACH side of the band, so this leaves 64%
// of the band as bar (measured: a 79px band gives a 50px column). It applies maxBarWidth
// AFTER the gap without redistributing the freed space, so the gap binds on the monthly view
// and the cap on the quarterly and semester ones — a column stays 50-56px wide throughout.
const CHART_BAR_CATEGORY_GAP = '18%';

// Room above the plot for the deployment marker's label. Mantine hands recharts a `margin`
// of its own with no `top` key, which wins over recharts' defaults entirely, so the plot
// starts at y=0 and a label positioned "top" is drawn at a negative y — outside the svg
// viewport. On screen Mantine's `svg { overflow: visible }` still paints it (over the
// section title); the PNG export rasterises the svg to its own box and loses it.
const CHART_TOP_MARGIN_PX = 20;

// Kept out of CHART_CHROME on purpose: Mantine spreads `barChartProps` onto the recharts
// chart as a whole object, so a call site passing its own would drop this one.
export const CHART_BAR_CHART_PROPS = {
    barCategoryGap: CHART_BAR_CATEGORY_GAP,
    margin: { top: CHART_TOP_MARGIN_PX },
};

// Plain grey band under the cursor: Mantine's default adds a dashed outline on top of it.
const CHART_CURSOR = { fill: 'var(--mantine-color-gray-1)', stroke: 'none' };

/**
 * Tooltip + cursor. Over a period with no deployment there is nothing to break down, so the
 * tooltip says so instead of showing a column of zeros.
 */
export const makeTooltipProps = (
    noDataLabels: Set<string>,
    series: ChartSeriesItem[],
    /** Categories switched off keep a zeroed bar, so they have to be filtered out here. */
    hiddenSeries?: Set<string>,
    emptyMessage: string = NOT_DEPLOYED_MESSAGE,
) => ({
    cursor: CHART_CURSOR,
    content: ({
        label,
        payload,
    }: {
        label?: string;
        payload?: React.ComponentProps<typeof ChartTooltip>['payload'];
    }) =>
        label !== undefined && noDataLabels.has(label) ? (
            <Paper px="md" py="xs" radius="md" shadow="md" withBorder>
                <Text size="sm" c="dimmed">
                    {emptyMessage}
                </Text>
            </Paper>
        ) : (
            <ChartTooltip
                label={label}
                payload={payload?.filter((item) => !hiddenSeries?.has(String(item.name)))}
                series={series.filter((item) => !hiddenSeries?.has(item.name))}
            />
        ),
});

/**
 * A hairline in a light grey separates the stacked segments — a 2px gutter in the page color
 * cut the columns into floating blocks and was harder to read than the data it separated.
 * Applied to every chart, single-series included, so a bar looks the same everywhere.
 * strokeOpacity is needed: Mantine defaults it to 0 (invisible stroke).
 *
 * No corner radius anywhere. A stack has one data end, so rounding only its top left every
 * interior boundary square, and a short top segment had its radius clamped down to nothing —
 * the caps read as a mix of rounded and square. Square is uniform by construction, and is
 * what Datawrapper, Observable, Vega-Lite and ECharts all default to.
 */
export const BAR_PROPS = {
    stroke: 'var(--mantine-color-gray-4)',
    strokeWidth: 1,
    strokeOpacity: 1,
    // Mantine hard-codes isAnimationActive: false; the columns are nicer growing in.
    isAnimationActive: true,
    animationDuration: 550,
    animationEasing: 'ease-out' as const,
};

/**
 * Bar props for a stacked chart: the same look, plus — on the entrance only — the
 * per-segment schedule that makes the stack grow as one column (see makeStackSchedule).
 *
 * Afterwards the schedule is dropped and BAR_PROPS' own easing applies, so a change of
 * categories or of data moves every segment together, from where it was. That reads as one
 * object because recharts interpolates each bar from its previous geometry and a linear
 * interpolation between two contiguous stacks is contiguous at every frame — which is why a
 * hidden category keeps its bar mounted at zero rather than being unmounted (see charts.tsx):
 * an unmounted bar has no previous geometry and would grow out of the middle of its neighbour.
 *
 * recharts 3 removes the need for the schedule entirely — it interpolates y from the stack
 * base — but @mantine/charts 7.17 peer-declares recharts ^2.13.3; drop it on Mantine 8+.
 */
export const makeStackedBarProps = (
    rows: Record<string, unknown>[],
    series: ChartSeriesItem[],
    { building, animate }: { building: boolean; animate: boolean },
    extra?: Partial<Omit<BarProps, 'ref'>>,
) => {
    // Built here rather than inside the returned function: Mantine calls barProps once per
    // series AND once per series per datum when resolving cell fills.
    const schedule = makeStackSchedule(
        rows,
        series.map((item) => item.name),
    );

    return (item: { name: string }) => ({
        ...BAR_PROPS,
        isAnimationActive: animate,
        ...(building
            ? {
                  // linear rather than eased: an eased slice decelerates at every segment
                  // boundary, and the column would climb in visible steps
                  animationEasing: 'linear' as const,
                  ...(schedule.get(item.name) ?? {}),
              }
            : {}),
        ...extra,
    });
};

const DIMMED_BAR_FILL_OPACITY = 0.3;

// recharts calls `shape` once per rendered rectangle, handing it the resolved geometry and
// the index of its period — the only public hook to style a single column of a stack.
type BarShapeProps = React.ComponentProps<typeof Rectangle> & { index?: number };

/** Fades the periods the reader did not pick. -1 means "nothing picked, all at full". */
export const makeSelectionShape = (selectedIndex: number) =>
    ((props: BarShapeProps) => (
        <Rectangle
            {...props}
            fillOpacity={selectedIndex === -1 || props.index === selectedIndex ? 1 : DIMMED_BAR_FILL_OPACITY}
        />
    )) as BarProps['shape'];

/**
 * A dashed line on the deployment period rather than a striped block over everything before
 * it: the pre-deployment span is often most of the chart and drowned the real data. Null
 * when the deployment falls outside the displayed periods.
 *
 * yAxisId must match Mantine's YAxis ("left"), else recharts cannot place it.
 */
export const deploymentMarker = (deploymentPeriod: string | null, periodKeys: string[]) =>
    deploymentPeriod === null || !periodKeys.includes(deploymentPeriod) ? null : (
        <ReferenceLine
            yAxisId="left"
            x={formatPeriod(deploymentPeriod)}
            stroke="var(--mantine-color-gray-6)"
            strokeDasharray="4 4"
            label={{
                value: 'Déploiement',
                position: 'top',
                fontSize: 11,
                fill: 'var(--mantine-color-gray-7)',
            }}
        />
    );

export interface SeriesToggle {
    hiddenSeries: Set<string>;
    toggle: (name: string) => void;
}

/**
 * Hiding a category takes it out of the stack. The last visible one cannot be hidden — an
 * empty chart is never what the reader meant. `external` lets a parent own the state, which
 * is how the groups chart and its period detail stay in step.
 */
export const useSeriesToggle = (
    series: ChartSeriesItem[],
    external?: SeriesToggle,
): SeriesToggle & {
    visibleSeries: ChartSeriesItem[];
    legendProps: { content: React.ReactElement; verticalAlign: 'bottom' };
} => {
    const [internalHidden, setInternalHidden] = useState<Set<string>>(new Set());

    const hiddenSeries = external?.hiddenSeries ?? internalHidden;
    const visibleSeries = series.filter((item) => !hiddenSeries.has(item.name));

    const toggle = (name: string) => {
        // counted from the visible list, not from hiddenSeries.size: a chart whose series
        // come and go with the data can carry a hidden name that no longer exists
        if (!hiddenSeries.has(name) && visibleSeries.length <= 1) {
            return;
        }

        if (external) {
            external.toggle(name);
            return;
        }

        setInternalHidden((previous) => {
            const next = new Set(previous);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    return {
        hiddenSeries,
        toggle,
        visibleSeries,
        legendProps: {
            content: <ChartLegendToggle series={series} hiddenSeries={hiddenSeries} onToggle={toggle} />,
            // below the plot, where the PNG export also draws it, and out of the way of the
            // tooltip (which Mantine pins to the top of the chart)
            verticalAlign: 'bottom' as const,
        },
    };
};
