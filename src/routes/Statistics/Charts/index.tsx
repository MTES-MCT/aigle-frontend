import React, { useRef, useState } from 'react';

import { ddtmActivityEndpoints } from '@/api/endpoints';
import LayoutBase from '@/components/LayoutBase';
import SoloAccordion from '@/components/SoloAccordion';
import SortableTable, { SortableTableColumn } from '@/components/SortableTable';
import ErrorCard from '@/components/ui/ErrorCard';
import InfoCard from '@/components/ui/InfoCard';
import Loader from '@/components/ui/Loader';
import StatTile from '@/components/ui/StatTile';
import {
    DdtmActivityControlStatusPeriod,
    DdtmActivityCountPeriod,
    DdtmActivityGranularity,
    DdtmActivityGroupsActivity,
    DdtmActivityPeriodTier,
    DdtmActivitySummary,
    DdtmActivityUser,
    DdtmActivityUserGroup,
    DdtmActivityUserGroupActivity,
    DdtmActivityUserGroupOption,
    UserActivityStatus,
} from '@/models/ddtm-activity';
import { DetectionControlStatus } from '@/models/detection';
import { useAuth } from '@/store/slices/auth';
import api from '@/utils/api';
import {
    DETECTION_CONTROL_STATUSES_COLORS_MAP,
    DETECTION_CONTROL_STATUSES_DESCRIPTIONS_MAP,
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    HEADER_HEIGHT_PX,
} from '@/utils/constants';
import { downloadChartPng, toFileSlug } from '@/utils/download';
import { formatDateOnly } from '@/utils/format';
import { BarChart, ChartTooltip, CompositeChart } from '@mantine/charts';
import {
    ActionIcon,
    Anchor,
    Badge,
    Button,
    Group,
    List,
    Paper,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { useScrollIntoView } from '@mantine/hooks';
import { IconChartBar, IconDownload, IconListDetails, IconPrinter, IconUsersGroup } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { ReferenceLine } from 'recharts';
import classes from './index.module.scss';

const CHART_CURSOR_FILL = 'var(--mantine-color-gray-2)';

const NOT_DEPLOYED_TOOLTIP = 'Groupe non déployé à cette période';
const NO_GROUP_DEPLOYED_TOOLTIP = 'Aucun groupe déployé à cette période';

type ChartSeriesItem = { name: string; label: string; color: string };

const MONTH_LABELS = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
];

// Period key -> label. "2026-07" -> "juil. 2026", "2026-Q3" -> "T3 2026",
// "2026-S2" -> "S2 2026". Pure string manipulation, timezone-proof.
const formatPeriod = (key: string): string => {
    const [year, part] = key.split('-');
    if (part.startsWith('Q')) {
        return `T${part.slice(1)} ${year}`;
    }
    if (part.startsWith('S')) {
        return `S${part.slice(1)} ${year}`;
    }
    return `${MONTH_LABELS[Number(part) - 1]} ${year}`;
};

// Plain grey band under the cursor (Mantine's default is a dashed outline). recharts only
// builds a band rect for BarChart; for CompositeChart it passes a vertical-line cursor
// (`points`) + the full plot width, so the band is rebuilt from plot width / period count.
const BandCursor: React.FC<{
    periodCount: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: { x: number; y: number }[];
}> = ({ periodCount, x = 0, y = 0, width = 0, height = 0, points }) => {
    if (points && points.length >= 2) {
        const bandWidth = width / periodCount;
        return (
            <rect
                x={points[0].x - bandWidth / 2}
                y={points[0].y}
                width={bandWidth}
                height={points[1].y - points[0].y}
                fill={CHART_CURSOR_FILL}
            />
        );
    }
    return <rect x={x} y={y} width={width} height={height} fill={CHART_CURSOR_FILL} />;
};

// Tooltip + cursor. Over a period with no deployment there is nothing to break down, so
// the tooltip says so instead of showing a column of zeros.
const makeTooltipProps = (
    noDataLabels: Set<string>,
    series: ChartSeriesItem[],
    periodCount: number,
    emptyMessage: string = NOT_DEPLOYED_TOOLTIP,
) => ({
    cursor: <BandCursor periodCount={periodCount} />,
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
            <ChartTooltip label={label} payload={payload} series={series} />
        ),
});

// Thin black outline on every bar so stacked segments read as distinct blocks.
// strokeOpacity is needed: Mantine defaults it to 0 (invisible stroke).
const CHART_BAR_PROPS = { stroke: 'var(--mantine-color-black)', strokeWidth: 1, strokeOpacity: 1 };
// stackId stacks the four tier bars of the activity chart into one column.
const ACTIVITY_BAR_PROPS = { ...CHART_BAR_PROPS, stackId: 'activity' };

// A dashed line on the deployment period rather than a striped block over everything
// before it: the pre-deployment span is often most of the chart and drowned the real
// data. Null when the deployment falls outside the displayed periods.
// yAxisId must match Mantine's YAxis ("left"), else recharts can't place it.
const deploymentMarker = (deploymentPeriod: string | null, periodKeys: string[]) =>
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

// Labels of the periods entirely before deployment (nothing to break down there).
const buildNoDataLabels = (noDataUntilPeriod: string | null, periodKeys: string[]) =>
    noDataUntilPeriod === null
        ? new Set<string>()
        : new Set(periodKeys.filter((key) => key <= noDataUntilPeriod).map(formatPeriod));

const ACTIVITY_TIERS: Record<UserActivityStatus, { label: string; color: string }> = {
    PILOT: { label: 'Pilote', color: 'blue.7' },
    RECURRENT: { label: 'Récurrent', color: 'teal.7' },
    ACTIVE: { label: 'Actif', color: 'yellow.6' },
    INACTIVE: { label: 'Inactif', color: 'gray.5' },
};

// Most to least engaged: stacking order, sort order and detail-column order.
const ACTIVITY_TIER_ORDER: UserActivityStatus[] = ['PILOT', 'RECURRENT', 'ACTIVE', 'INACTIVE'];

// Bottom-to-top: pilots, recurrents, actives, inactives (all stacked bars).
const ACTIVITY_CHART_SERIES = [
    { name: 'pilotCount', label: ACTIVITY_TIERS.PILOT.label, color: ACTIVITY_TIERS.PILOT.color, type: 'bar' as const },
    {
        name: 'recurrentCount',
        label: ACTIVITY_TIERS.RECURRENT.label,
        color: ACTIVITY_TIERS.RECURRENT.color,
        type: 'bar' as const,
    },
    {
        name: 'activeCount',
        label: ACTIVITY_TIERS.ACTIVE.label,
        color: ACTIVITY_TIERS.ACTIVE.color,
        type: 'bar' as const,
    },
    {
        name: 'inactiveCount',
        label: ACTIVITY_TIERS.INACTIVE.label,
        color: ACTIVITY_TIERS.INACTIVE.color,
        type: 'bar' as const,
    },
];

const GRANULARITY_OPTIONS: { label: string; value: DdtmActivityGranularity }[] = [
    { label: 'Mensuel', value: 'MONTH' },
    { label: 'Trimestriel', value: 'QUARTER' },
    { label: 'Semestriel', value: 'SEMESTER' },
];

const sumBy = <T,>(items: T[], getValue: (item: T) => number) =>
    items.reduce((total, item) => total + getValue(item), 0);

const ActivityBadge: React.FC<{ status: UserActivityStatus }> = ({ status }) => (
    <Badge variant="light" radius="sm" color={ACTIVITY_TIERS[status].color}>
        {ACTIVITY_TIERS[status].label}
    </Badge>
);

const CountBadge: React.FC<{ count: number; color: string }> = ({ count, color }) => (
    <Badge variant="light" radius="sm" color={color}>
        {count}
    </Badge>
);

// Stable stacking order for the control-status chart, following the shared names map.
const CONTROL_STATUS_ORDER = Object.keys(DETECTION_CONTROL_STATUSES_NAMES_MAP) as DetectionControlStatus[];

// Chart block: title + a PNG export of the rendered chart (for slides and reports).
const ChartSection: React.FC<{ title: string; fileNameContext?: string; children: React.ReactNode }> = ({
    title,
    fileNameContext,
    children,
}) => {
    const chartRef = useRef<HTMLDivElement>(null);

    return (
        <Stack gap="xs" className={classes['chart-section']}>
            <Group justify="space-between" wrap="nowrap">
                <Text fw={600}>{title}</Text>
                <Tooltip label="Télécharger le graphique (PNG)">
                    <ActionIcon
                        className={classes['no-print']}
                        variant="subtle"
                        size="lg"
                        aria-label="Télécharger le graphique (PNG)"
                        onClick={() =>
                            chartRef.current &&
                            downloadChartPng(
                                chartRef.current,
                                `${toFileSlug(`${fileNameContext || ''} ${title}`)}.png`,
                                fileNameContext ? `${fileNameContext} — ${title}` : title,
                            )
                        }
                    >
                        <IconDownload size={18} />
                    </ActionIcon>
                </Tooltip>
            </Group>
            <div ref={chartRef}>{children}</div>
        </Stack>
    );
};

// Stacked tier bars, one column per period. Used both per-user (group detail) and
// per-group (department-wide). Hover on a period with no entity (totalCount 0) explains
// the gap instead of showing zeros — pre-deployment or not-yet-existing group.
const ActivityChart: React.FC<{
    title: string;
    data: DdtmActivityPeriodTier[];
    deploymentPeriod: string | null;
    fileNameContext?: string;
    emptyMessage?: string;
}> = ({ title, data, deploymentPeriod, fileNameContext, emptyMessage }) => {
    const noDataLabels = new Set(data.filter((tier) => tier.totalCount === 0).map((tier) => formatPeriod(tier.period)));

    return (
        <ChartSection title={title} fileNameContext={fileNameContext}>
            <CompositeChart
                h={320}
                data={data.map((tier) => ({
                    period: formatPeriod(tier.period),
                    pilotCount: tier.pilotCount,
                    recurrentCount: tier.recurrentCount,
                    activeCount: tier.activeCount,
                    inactiveCount: tier.inactiveCount,
                }))}
                dataKey="period"
                series={ACTIVITY_CHART_SERIES}
                withLegend
                yAxisProps={{ allowDecimals: false }}
                tooltipProps={makeTooltipProps(noDataLabels, ACTIVITY_CHART_SERIES, data.length, emptyMessage)}
                barProps={ACTIVITY_BAR_PROPS}
            >
                {deploymentMarker(
                    deploymentPeriod,
                    data.map((tier) => tier.period),
                )}
            </CompositeChart>
        </ChartSection>
    );
};

const ControlStatusChart: React.FC<{
    data: DdtmActivityControlStatusPeriod[];
    deploymentPeriod: string | null;
    noDataLabels: Set<string>;
    fileNameContext: string;
}> = ({ data, deploymentPeriod, noDataLabels, fileNameContext }) => {
    // Only chart the control statuses that actually occurred, reusing the app's status
    // colors/labels so the chart matches the rest of the app.
    const presentStatuses = new Set(data.flatMap((period) => period.counts.map((count) => count.status)));
    const series = CONTROL_STATUS_ORDER.filter((status) => presentStatuses.has(status)).map((status) => ({
        name: status,
        label: DETECTION_CONTROL_STATUSES_NAMES_MAP[status],
        color: DETECTION_CONTROL_STATUSES_COLORS_MAP[status],
    }));

    return (
        <ChartSection title="Changements de statut de contrôle par période" fileNameContext={fileNameContext}>
            {series.length ? (
                <BarChart
                    h={320}
                    data={data.map((period) => ({
                        period: formatPeriod(period.period),
                        ...Object.fromEntries(period.counts.map((count) => [count.status, count.count])),
                    }))}
                    dataKey="period"
                    type="stacked"
                    series={series}
                    withLegend
                    yAxisProps={{ allowDecimals: false }}
                    tooltipProps={makeTooltipProps(noDataLabels, series, data.length)}
                    barProps={CHART_BAR_PROPS}
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

const CountBarChart: React.FC<{
    title: string;
    periods: DdtmActivityCountPeriod[];
    label: string;
    color: string;
    deploymentPeriod: string | null;
    noDataLabels: Set<string>;
    fileNameContext: string;
}> = ({ title, periods, label, color, deploymentPeriod, noDataLabels, fileNameContext }) => {
    const series = [{ name: 'count', label, color }];

    return (
        <ChartSection title={title} fileNameContext={fileNameContext}>
            <BarChart
                h={280}
                data={periods.map((period) => ({ period: formatPeriod(period.period), count: period.count }))}
                dataKey="period"
                series={series}
                yAxisProps={{ allowDecimals: false }}
                tooltipProps={makeTooltipProps(noDataLabels, series, periods.length)}
                barProps={CHART_BAR_PROPS}
            >
                {deploymentMarker(
                    deploymentPeriod,
                    periods.map((period) => period.period),
                )}
            </BarChart>
        </ChartSection>
    );
};

// One row per period, one column per category, listing the groups it holds — the counts
// of the chart above, named.
type PeriodDetailRow = { period: string; namesByTier: Record<UserActivityStatus, string[]> };

const buildPeriodDetailRows = (activity: DdtmActivityGroupsActivity): PeriodDetailRow[] =>
    activity.activityByPeriod.map(({ period }) => ({
        period,
        namesByTier: Object.fromEntries(
            ACTIVITY_TIER_ORDER.map((tier) => [
                tier,
                activity.groups
                    .filter((group) => group.tierByPeriod[period] === tier)
                    .map((group) => group.name)
                    .sort((a, b) => a.localeCompare(b, 'fr')),
            ]),
        ) as Record<UserActivityStatus, string[]>,
    }));

const PERIOD_DETAIL_COLUMNS: SortableTableColumn<PeriodDetailRow>[] = [
    {
        key: 'period',
        label: 'Période',
        value: (row) => formatPeriod(row.period),
        sortValue: (row) => row.period,
    },
    ...ACTIVITY_TIER_ORDER.map((tier) => ({
        key: tier,
        label: ACTIVITY_TIERS[tier].label,
        value: (row: PeriodDetailRow) => row.namesByTier[tier].join(', '),
        render: (row: PeriodDetailRow) =>
            row.namesByTier[tier].length ? (
                row.namesByTier[tier].join(', ')
            ) : (
                <Text c="dimmed" size="sm">
                    —
                </Text>
            ),
    })),
];

const GroupsPeriodDetailTable: React.FC<{ activity: DdtmActivityGroupsActivity }> = ({ activity }) => (
    <SoloAccordion title="Détail des groupes par catégorie" icon={<IconListDetails />}>
        <SortableTable<PeriodDetailRow>
            columns={PERIOD_DETAIL_COLUMNS}
            items={buildPeriodDetailRows(activity)}
            getItemKey={(row) => row.period}
            initialSort={{ key: 'period', order: 'desc' }}
            csvFileName={`groupes-par-categorie-${activity.granularity.toLowerCase()}.csv`}
        />
    </SoloAccordion>
);

const USER_COLUMNS: SortableTableColumn<DdtmActivityUser>[] = [
    { key: 'email', label: 'Adresse email', value: (user) => user.email },
    {
        key: 'operationalActionsCount',
        label: 'Actions opérationnelles (30 j)',
        value: (user) => user.operationalActionsCount,
    },
    { key: 'connectionsCount', label: 'Connexions (30 j)', value: (user) => user.connectionsCount },
    {
        key: 'activityStatus',
        label: 'Type',
        value: (user) => ACTIVITY_TIERS[user.activityStatus].label,
        sortValue: (user) => ACTIVITY_TIER_ORDER.indexOf(user.activityStatus),
        render: (user) => <ActivityBadge status={user.activityStatus} />,
    },
];

const GroupUsersTable: React.FC<{ userGroupUuid: string; groupName: string }> = ({ userGroupUuid, groupName }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: [ddtmActivityEndpoints.userGroupUsers(userGroupUuid)],
        queryFn: ({ signal }) =>
            api<DdtmActivityUser[]>(ddtmActivityEndpoints.userGroupUsers(userGroupUuid), { signal }),
    });

    if (isLoading) {
        return <Loader />;
    }
    if (error || !data) {
        return <ErrorCard>{error ? error.message : 'Aucune donnée'}</ErrorCard>;
    }

    return (
        <SortableTable<DdtmActivityUser>
            columns={USER_COLUMNS}
            items={data}
            getItemKey={(user) => user.uuid}
            initialSort={{ key: 'operationalActionsCount', order: 'desc' }}
            searchPlaceholder="Rechercher un utilisateur"
            csvFileName={`utilisateurs-${toFileSlug(groupName)}.csv`}
        />
    );
};

const GroupsActivityChart: React.FC<{ granularity: DdtmActivityGranularity }> = ({ granularity }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: [ddtmActivityEndpoints.groupsActivity, granularity],
        queryFn: ({ signal }) =>
            api<DdtmActivityGroupsActivity>(ddtmActivityEndpoints.groupsActivity, {
                params: { granularity },
                signal,
            }),
    });

    if (isLoading) {
        return <Loader />;
    }
    if (error || !data) {
        return <ErrorCard>{error ? error.message : 'Aucune donnée'}</ErrorCard>;
    }

    return (
        <Stack gap="xs">
            <ActivityChart
                title="Activité des groupes par période"
                data={data.activityByPeriod}
                deploymentPeriod={null}
                emptyMessage={NO_GROUP_DEPLOYED_TOOLTIP}
            />
            <GroupsPeriodDetailTable activity={data} />
        </Stack>
    );
};

// `withUsersTable`: the per-user detail (emails) is reserved for DDTM members — the API
// serves it on a DDTM-only route.
const GroupCharts: React.FC<{
    userGroupUuid: string;
    granularity: DdtmActivityGranularity;
    withUsersTable?: boolean;
}> = ({ userGroupUuid, granularity, withUsersTable = true }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: [ddtmActivityEndpoints.userGroupActivity(userGroupUuid), granularity],
        queryFn: ({ signal }) =>
            api<DdtmActivityUserGroupActivity>(ddtmActivityEndpoints.userGroupActivity(userGroupUuid), {
                params: { granularity },
                signal,
            }),
    });

    if (isLoading) {
        return <Loader />;
    }
    if (error || !data) {
        return <ErrorCard>{error ? error.message : 'Aucune donnée'}</ErrorCard>;
    }

    const periodKeys = data.activityByPeriod.map((period) => period.period);
    const noDataLabels = buildNoDataLabels(data.noDataUntilPeriod, periodKeys);
    // The marker is only drawn when the deployment falls inside the displayed periods.
    const deploymentMarkerShown = data.deploymentPeriod !== null && periodKeys.includes(data.deploymentPeriod);

    return (
        <Stack gap="xl">
            {data.deploymentDate ? (
                <Text size="sm" c="dimmed">
                    Groupe déployé le {formatDateOnly(data.deploymentDate)}
                    {deploymentMarkerShown ? ' (trait pointillé)' : ''} : avant cette date, le groupe n&apos;utilisait
                    pas AIGLE.
                </Text>
            ) : null}
            <ActivityChart
                title="Activité des utilisateurs par période"
                data={data.activityByPeriod}
                deploymentPeriod={data.deploymentPeriod}
                fileNameContext={data.name}
            />
            <ControlStatusChart
                data={data.controlStatusChangesByPeriod}
                deploymentPeriod={data.deploymentPeriod}
                noDataLabels={noDataLabels}
                fileNameContext={data.name}
            />
            <CountBarChart
                title="Téléchargements de rapport par période"
                periods={data.reportDownloadsByPeriod}
                label="Téléchargements"
                color="blue.6"
                deploymentPeriod={data.deploymentPeriod}
                noDataLabels={noDataLabels}
                fileNameContext={data.name}
            />
            <CountBarChart
                title="Connexions par période"
                periods={data.connectionsByPeriod}
                label="Connexions"
                color="green.6"
                deploymentPeriod={data.deploymentPeriod}
                noDataLabels={noDataLabels}
                fileNameContext={data.name}
            />
            {withUsersTable ? <GroupUsersTable userGroupUuid={userGroupUuid} groupName={data.name} /> : null}
        </Stack>
    );
};

const LegendInfoCard: React.FC = () => (
    <InfoCard title="Légende">
        <Text size="sm" fw={600}>
            Catégories d&apos;activité
        </Text>
        <Text size="sm">
            Chaque groupe (ou utilisateur) est classé dans une seule catégorie par période. Une « action opérationnelle
            » correspond à un changement de statut de contrôle.
        </Text>
        <List size="sm" mt="xs" spacing={4}>
            <List.Item>
                <b>Pilote</b> : au moins 7 actions opérationnelles
            </List.Item>
            <List.Item>
                <b>Récurrent</b> : au moins 4 actions opérationnelles
            </List.Item>
            <List.Item>
                <b>Actif</b> : au moins 1 connexion ou 1 action sur la période
            </List.Item>
            <List.Item>
                <b>Inactif</b> : aucune action et aucune connexion
            </List.Item>
        </List>
        <Text size="sm" mt="xs">
            Dans le tableau des groupes, « utilisateurs actifs » regroupe tous les utilisateurs qui ne sont pas inactifs
            : pilotes, récurrents et actifs confondus.
        </Text>

        <Text size="sm" fw={600} mt="md">
            Statuts de contrôle
        </Text>
        <Text size="sm">
            Statut du suivi d&apos;un objet détecté par les agents. C&apos;est son changement qui compte comme action
            opérationnelle.
        </Text>
        <List size="sm" mt="xs" spacing={4}>
            {CONTROL_STATUS_ORDER.map((status) => (
                <List.Item key={status}>
                    <b>{DETECTION_CONTROL_STATUSES_NAMES_MAP[status]}</b> :{' '}
                    {DETECTION_CONTROL_STATUSES_DESCRIPTIONS_MAP[status]}
                </List.Item>
            ))}
        </List>
    </InfoCard>
);

const buildGroupColumns = (onGroupSelected: (uuid: string) => void): SortableTableColumn<DdtmActivityUserGroup>[] => [
    {
        key: 'name',
        label: 'Groupe utilisateur',
        value: (group) => group.name,
        render: (group) => (
            <Anchor component="button" type="button" ta="left" onClick={() => onGroupSelected(group.uuid)}>
                {group.name}
            </Anchor>
        ),
        footer: (groups) => `Total (${groups.length} groupes)`,
    },
    {
        key: 'deploymentDate',
        label: 'Déployé le',
        // Deployment = the group's earliest member first login (see the API service).
        value: (group) => group.deploymentDate,
        render: (group) => (group.deploymentDate ? formatDateOnly(group.deploymentDate) : '—'),
    },
    {
        key: 'deployedSinceWeeks',
        label: 'Déployé depuis (semaines)',
        value: (group) => (group.deploymentDate === null ? null : group.deployedSinceWeeks ?? 0),
    },
    {
        key: 'usersCount',
        label: 'Utilisateurs',
        value: (group) => group.usersCount,
        render: (group) => <CountBadge count={group.usersCount} color="gray" />,
        footer: (groups) => sumBy(groups, (group) => group.usersCount),
    },
    {
        key: 'activeUsersCount',
        label: 'Utilisateurs actifs (30 j)',
        value: (group) => group.activeUsersCount,
        render: (group) => <CountBadge count={group.activeUsersCount} color={ACTIVITY_TIERS.ACTIVE.color} />,
        footer: (groups) => sumBy(groups, (group) => group.activeUsersCount),
    },
    {
        key: 'pilotUsersCount',
        label: 'Utilisateurs pilotes (30 j)',
        value: (group) => group.pilotUsersCount,
        render: (group) => <CountBadge count={group.pilotUsersCount} color={ACTIVITY_TIERS.PILOT.color} />,
        footer: (groups) => sumBy(groups, (group) => group.pilotUsersCount),
    },
];

const GroupsTable: React.FC<{ onGroupSelected: (uuid: string) => void }> = ({ onGroupSelected }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: [ddtmActivityEndpoints.userGroups],
        queryFn: ({ signal }) => api<DdtmActivityUserGroup[]>(ddtmActivityEndpoints.userGroups, { signal }),
    });

    if (isLoading) {
        return <Loader />;
    }
    if (error || !data) {
        return <ErrorCard>{error ? error.message : 'Aucune donnée'}</ErrorCard>;
    }

    return (
        <SortableTable<DdtmActivityUserGroup>
            columns={buildGroupColumns(onGroupSelected)}
            items={data}
            getItemKey={(group) => group.uuid}
            initialSort={{ key: 'name', order: 'asc' }}
            searchPlaceholder="Rechercher un groupe"
            csvFileName="groupes-utilisateurs.csv"
        />
    );
};

const GranularityControl: React.FC<{
    granularity: DdtmActivityGranularity;
    onChange: (granularity: DdtmActivityGranularity) => void;
}> = ({ granularity, onChange }) => (
    <SegmentedControl
        className={classes['granularity-control']}
        value={granularity}
        onChange={(value) => onChange(value as DdtmActivityGranularity)}
        data={GRANULARITY_OPTIONS}
    />
);

// DDTM users: the whole department — overview, every collectivity group, then one group
// in detail (per-user table included).
const DepartmentDashboard: React.FC<{ summary: DdtmActivitySummary }> = ({ summary }) => {
    const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(null);
    const [granularity, setGranularity] = useState<DdtmActivityGranularity>('MONTH');
    // Scrolls the body (the real scroll container: `body { overflow-x: hidden }` promotes
    // it, so window.scrollTo does nothing — this hook writes body.scrollTop directly).
    const { scrollIntoView, targetRef } = useScrollIntoView<HTMLDivElement>({
        offset: HEADER_HEIGHT_PX,
        duration: 500,
    });

    // Select the group, then bring section 2 up under the fixed header (offset = HEADER_HEIGHT_PX).
    const selectGroup = (uuid: string) => {
        setSelectedGroupUuid(uuid);
        scrollIntoView({ alignment: 'start' });
    };

    return (
        <Stack gap="xl">
            <Stack gap="lg">
                <Text c="dimmed">Activité des groupes utilisateurs du département : {summary.departmentName}</Text>

                <LegendInfoCard />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <StatTile
                        icon={<IconUsersGroup size={20} />}
                        label="Groupes utilisateurs"
                        value={summary.userGroupsCount}
                    />
                    <StatTile
                        icon={<IconChartBar size={20} />}
                        label="Groupes actifs (30 derniers jours)"
                        value={summary.activeUserGroupsCount}
                    />
                </SimpleGrid>

                <GroupsTable onGroupSelected={selectGroup} />

                {/* Right above the charts it drives — the tables above are not affected. */}
                <GranularityControl granularity={granularity} onChange={setGranularity} />

                <GroupsActivityChart granularity={granularity} />
            </Stack>

            <Stack gap="md" ref={targetRef}>
                <Text fw={600}>Activité d&apos;un groupe utilisateur</Text>
                <Select
                    className={classes['group-select']}
                    placeholder="Sélectionner un groupe utilisateur"
                    data={summary.userGroups.map((group) => ({ value: group.uuid, label: group.name }))}
                    value={selectedGroupUuid}
                    onChange={setSelectedGroupUuid}
                    searchable
                    clearable
                />
                {selectedGroupUuid ? (
                    <GroupCharts key={selectedGroupUuid} userGroupUuid={selectedGroupUuid} granularity={granularity} />
                ) : (
                    <Text c="dimmed" size="sm">
                        Sélectionnez un groupe utilisateur pour afficher son activité.
                    </Text>
                )}
            </Stack>
        </Stack>
    );
};

// Everyone else: their own group's charts only — no department overview, and no per-user
// detail (that one is DDTM-only, API included).
const OwnGroupDashboard: React.FC<{ groups: DdtmActivityUserGroupOption[] }> = ({ groups }) => {
    const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(groups[0]?.uuid ?? null);
    const [granularity, setGranularity] = useState<DdtmActivityGranularity>('MONTH');

    if (!groups.length) {
        return <ErrorCard>Aucun groupe utilisateur ne vous est rattaché.</ErrorCard>;
    }

    return (
        <Stack gap="lg">
            <LegendInfoCard />

            {groups.length > 1 ? (
                <Select
                    className={classes['group-select']}
                    label="Groupe utilisateur"
                    data={groups.map((group) => ({ value: group.uuid, label: group.name }))}
                    value={selectedGroupUuid}
                    onChange={setSelectedGroupUuid}
                    allowDeselect={false}
                />
            ) : (
                <Text fw={600}>Activité du groupe : {groups[0].name}</Text>
            )}

            <GranularityControl granularity={granularity} onChange={setGranularity} />

            {selectedGroupUuid ? (
                <GroupCharts
                    key={selectedGroupUuid}
                    userGroupUuid={selectedGroupUuid}
                    granularity={granularity}
                    withUsersTable={false}
                />
            ) : null}
        </Stack>
    );
};

const Component: React.FC = () => {
    const { getCanViewStatistics } = useAuth();
    const canViewStatistics = getCanViewStatistics();

    // Which dashboard the user may see is the API's call, not ours: a super-admin is
    // scoped to a user group (X-User-Group-Uuid) that the client cannot classify on its
    // own, and only the server knows which groups are readable. A department name means
    // "DDTM caller".
    const {
        data: summary,
        isLoading,
        error,
    } = useQuery({
        enabled: canViewStatistics,
        queryKey: [ddtmActivityEndpoints.summary],
        queryFn: ({ signal }) => api<DdtmActivitySummary>(ddtmActivityEndpoints.summary, { signal }),
    });

    if (!canViewStatistics) {
        return <Navigate to="/" />;
    }

    return (
        <LayoutBase title="Statistiques">
            <div className={classes.container}>
                <Stack gap="lg">
                    <Group justify="flex-end">
                        <Button
                            className={classes['no-print']}
                            variant="default"
                            leftSection={<IconPrinter size={16} />}
                            onClick={() => window.print()}
                        >
                            Rapport complet (PDF)
                        </Button>
                    </Group>

                    {isLoading ? <Loader /> : null}
                    {error ? <ErrorCard>{error.message}</ErrorCard> : null}
                    {summary ? (
                        summary.departmentName !== null ? (
                            <DepartmentDashboard summary={summary} />
                        ) : (
                            <OwnGroupDashboard groups={summary.userGroups} />
                        )
                    ) : null}
                </Stack>
            </div>
        </LayoutBase>
    );
};

export default Component;
