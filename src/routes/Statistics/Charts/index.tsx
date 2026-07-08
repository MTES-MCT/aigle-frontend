import React, { useState } from 'react';

import { ddtmActivityEndpoints } from '@/api/endpoints';
import DataTable from '@/components/DataTable';
import LayoutBase from '@/components/LayoutBase';
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
    UserActivityStatus,
} from '@/models/ddtm-activity';
import { DetectionControlStatus } from '@/models/detection';
import { useAuth } from '@/store/slices/auth';
import api from '@/utils/api';
import {
    DETECTION_CONTROL_STATUSES_COLORS_MAP,
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    HEADER_HEIGHT_PX,
} from '@/utils/constants';
import { formatDateOnly } from '@/utils/format';
import { BarChart, ChartTooltip, CompositeChart } from '@mantine/charts';
import { Anchor, Badge, List, SegmentedControl, Select, SimpleGrid, Stack, Table, Text, Tooltip } from '@mantine/core';
import { useScrollIntoView } from '@mantine/hooks';
import { IconChartBar, IconUsersGroup } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { ReferenceArea } from 'recharts';
import classes from './index.module.scss';

const CHART_CURSOR_FILL = 'var(--mantine-color-gray-2)';

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

// Hover goes inert over no-data periods (nothing rendered); otherwise a plain grey band
// (Mantine's default is a dashed outline). recharts only builds a band rect for BarChart;
// for CompositeChart it passes a vertical-line cursor (`points`) + the full plot width, so
// the band is rebuilt from the plot width / period count.
const NoDataAwareCursor: React.FC<{
    noDataLabels: Set<string>;
    periodCount: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: { x: number; y: number }[];
    payload?: { payload: { period: string } }[];
}> = ({ noDataLabels, periodCount, x = 0, y = 0, width = 0, height = 0, points, payload }) => {
    const period = payload?.[0]?.payload?.period;
    if (period !== undefined && noDataLabels.has(period)) {
        return null;
    }
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

// Tooltip + cursor that both suppress themselves over the no-data zone.
const makeTooltipProps = (noDataLabels: Set<string>, series: ChartSeriesItem[], periodCount: number) => ({
    cursor: <NoDataAwareCursor noDataLabels={noDataLabels} periodCount={periodCount} />,
    content: ({
        label,
        payload,
    }: {
        label?: string;
        payload?: React.ComponentProps<typeof ChartTooltip>['payload'];
    }) =>
        label !== undefined && noDataLabels.has(label) ? null : (
            <ChartTooltip label={label} payload={payload} series={series} />
        ),
});

// Thin black outline on every bar so stacked segments read as distinct blocks.
// strokeOpacity is needed: Mantine defaults it to 0 (invisible stroke).
const CHART_BAR_PROPS = { stroke: 'var(--mantine-color-black)', strokeWidth: 1, strokeOpacity: 1 };
// stackId stacks the four tier bars of the activity chart into one column.
const ACTIVITY_BAR_PROPS = { ...CHART_BAR_PROPS, stackId: 'activity' };

// Diagonal grey hatch marking the "not deployed" (no data) periods.
const STRIPE_PATTERN_ID = 'ddtm-no-data-stripes';

// Raw <defs> element (NOT a component: recharts renders SVG-tag children but drops
// custom components). The pattern is referenced by the ReferenceArea's fill.
const STRIPE_DEFS = (
    <defs>
        <pattern
            id={STRIPE_PATTERN_ID}
            width={6}
            height={6}
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
        >
            <rect width={6} height={6} fill="var(--mantine-color-gray-1)" />
            <line x1={0} y1={0} x2={0} y2={6} stroke="var(--mantine-color-gray-4)" strokeWidth={2} />
        </pattern>
    </defs>
);

// Centered label with a solid grey box behind it (SVG has no text background) so it
// stays readable over the diagonal stripes. recharts clones this with the area viewBox.
const NO_DATA_LABEL_TEXT = 'Groupe non-déployé';
const NoDataLabel: React.FC<{ viewBox?: { x: number; y: number; width: number; height: number } }> = ({ viewBox }) => {
    if (!viewBox) {
        return null;
    }
    const cx = viewBox.x + viewBox.width / 2;
    const cy = viewBox.y + viewBox.height / 2;
    const boxWidth = NO_DATA_LABEL_TEXT.length * 6.6 + 16;
    const boxHeight = 22;
    return (
        <g>
            <rect
                x={cx - boxWidth / 2}
                y={cy - boxHeight / 2}
                width={boxWidth}
                height={boxHeight}
                rx={4}
                fill="var(--mantine-color-gray-2)"
            />
            <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fill="var(--mantine-color-gray-7)"
            >
                {NO_DATA_LABEL_TEXT}
            </text>
        </g>
    );
};

// A single striped zone covering every period up to (and including) `untilPeriod` — the
// last pre-deployment column. Passed as chart children; null when there is nothing to
// grey out (already deployed, or department-wide chart with no single deployment).
const noDataZone = (untilPeriod: string | null) =>
    untilPeriod === null ? null : (
        <>
            {STRIPE_DEFS}
            {/* yAxisId must match Mantine's YAxis ("left"), else recharts can't place it. */}
            <ReferenceArea
                yAxisId="left"
                x2={untilPeriod}
                fill={`url(#${STRIPE_PATTERN_ID})`}
                fillOpacity={1}
                stroke="none"
                label={<NoDataLabel />}
            />
        </>
    );

// { noDataUntil: last pre-deploy period label, noDataLabels: all pre-deploy labels }.
const buildNoData = (noDataUntilPeriod: string | null, periodKeys: string[]) =>
    noDataUntilPeriod === null
        ? { noDataUntil: null as string | null, noDataLabels: new Set<string>() }
        : {
              noDataUntil: formatPeriod(noDataUntilPeriod),
              noDataLabels: new Set(periodKeys.filter((key) => key <= noDataUntilPeriod).map(formatPeriod)),
          };

const ACTIVITY_TIERS: Record<UserActivityStatus, { label: string; color: string }> = {
    PILOT: { label: 'Pilote', color: 'blue.7' },
    RECURRENT: { label: 'Récurrent', color: 'teal.7' },
    ACTIVE: { label: 'Actif', color: 'yellow.6' },
    INACTIVE: { label: 'Inactif', color: 'gray.5' },
};

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

const ActivityBadge: React.FC<{ status: UserActivityStatus }> = ({ status }) => (
    <Badge variant="light" radius="sm" color={ACTIVITY_TIERS[status].color}>
        {ACTIVITY_TIERS[status].label}
    </Badge>
);

const GroupUsersTable: React.FC<{ userGroupUuid: string }> = ({ userGroupUuid }) => (
    <DataTable<DdtmActivityUser, undefined>
        endpoint={ddtmActivityEndpoints.userGroupUsers(userGroupUuid)}
        paginated={false}
        striped={false}
        highlightOnHover={false}
        showRefresh={false}
        layout="auto"
        tableContainerClassName={classes['bordered-table']}
        tableHeader={[
            <Table.Th key="email">Adresse email</Table.Th>,
            <Table.Th key="operationalActionsCount">Actions opérationnelles (30 j)</Table.Th>,
            <Table.Th key="connectionsCount">Connexions (30 j)</Table.Th>,
            <Table.Th key="activityStatus">Type</Table.Th>,
        ]}
        tableBodyRenderFns={[
            (user: DdtmActivityUser) => user.email,
            (user: DdtmActivityUser) => user.operationalActionsCount,
            (user: DdtmActivityUser) => user.connectionsCount,
            (user: DdtmActivityUser) => <ActivityBadge status={user.activityStatus} />,
        ]}
    />
);

// Stable stacking order for the control-status chart, following the shared names map.
const CONTROL_STATUS_ORDER = Object.keys(DETECTION_CONTROL_STATUSES_NAMES_MAP) as DetectionControlStatus[];

const ChartSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Stack gap="xs">
        <Text fw={600}>{title}</Text>
        {children}
    </Stack>
);

// Stacked tier bars + a "Total" line. Used both per-user (group detail) and per-group
// (department-wide). `noDataUntil` greys out pre-deployment periods; hover is suppressed
// on any period with no entity (totalCount 0) — pre-deployment or not-yet-existing group.
const ActivityChart: React.FC<{
    title: string;
    data: DdtmActivityPeriodTier[];
    noDataUntil: string | null;
}> = ({ title, data, noDataUntil }) => {
    const noDataLabels = new Set(data.filter((tier) => tier.totalCount === 0).map((tier) => formatPeriod(tier.period)));
    return (
        <ChartSection title={title}>
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
                tooltipProps={makeTooltipProps(noDataLabels, ACTIVITY_CHART_SERIES, data.length)}
                barProps={ACTIVITY_BAR_PROPS}
            >
                {noDataZone(noDataUntil)}
            </CompositeChart>
        </ChartSection>
    );
};

const ControlStatusChart: React.FC<{
    data: DdtmActivityControlStatusPeriod[];
    noDataUntil: string | null;
    noDataLabels: Set<string>;
}> = ({ data, noDataUntil, noDataLabels }) => {
    // Only chart the control statuses that actually occurred, reusing the app's status
    // colors/labels so the chart matches the rest of the app.
    const presentStatuses = new Set(data.flatMap((period) => period.counts.map((count) => count.status)));
    const series = CONTROL_STATUS_ORDER.filter((status) => presentStatuses.has(status)).map((status) => ({
        name: status,
        label: DETECTION_CONTROL_STATUSES_NAMES_MAP[status],
        color: DETECTION_CONTROL_STATUSES_COLORS_MAP[status],
    }));

    return (
        <ChartSection title="Changements de statut de contrôle par période">
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
                    {noDataZone(noDataUntil)}
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
    noDataUntil: string | null;
    noDataLabels: Set<string>;
}> = ({ title, periods, label, color, noDataUntil, noDataLabels }) => {
    const series = [{ name: 'count', label, color }];
    return (
        <ChartSection title={title}>
            <BarChart
                h={280}
                data={periods.map((period) => ({ period: formatPeriod(period.period), count: period.count }))}
                dataKey="period"
                series={series}
                yAxisProps={{ allowDecimals: false }}
                tooltipProps={makeTooltipProps(noDataLabels, series, periods.length)}
                barProps={CHART_BAR_PROPS}
            >
                {noDataZone(noDataUntil)}
            </BarChart>
        </ChartSection>
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

    return <ActivityChart title="Activité des groupes par période" data={data.activityByPeriod} noDataUntil={null} />;
};

const GroupCharts: React.FC<{ userGroupUuid: string; granularity: DdtmActivityGranularity }> = ({
    userGroupUuid,
    granularity,
}) => {
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

    const { noDataUntil, noDataLabels } = buildNoData(
        data.noDataUntilPeriod,
        data.activityByPeriod.map((period) => period.period),
    );

    return (
        <Stack gap="xl">
            <ActivityChart
                title="Activité des utilisateurs par période"
                data={data.activityByPeriod}
                noDataUntil={noDataUntil}
            />
            <ControlStatusChart
                data={data.controlStatusChangesByPeriod}
                noDataUntil={noDataUntil}
                noDataLabels={noDataLabels}
            />
            <CountBarChart
                title="Téléchargements de rapport par période"
                periods={data.reportDownloadsByPeriod}
                label="Téléchargements"
                color="blue.6"
                noDataUntil={noDataUntil}
                noDataLabels={noDataLabels}
            />
            <CountBarChart
                title="Connexions par période"
                periods={data.connectionsByPeriod}
                label="Connexions"
                color="green.6"
                noDataUntil={noDataUntil}
                noDataLabels={noDataLabels}
            />
            <GroupUsersTable userGroupUuid={userGroupUuid} />
        </Stack>
    );
};

const ActivityDefinitionsInfoCard: React.FC = () => (
    <InfoCard title="Comment sont calculées les catégories d'activité">
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
            Les périodes précédant le déploiement d&apos;un groupe sont grisées.
        </Text>
    </InfoCard>
);

const Component: React.FC = () => {
    const { getCanViewStatistics } = useAuth();
    const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(null);
    const [granularity, setGranularity] = useState<DdtmActivityGranularity>('MONTH');
    // Scrolls the body (the real scroll container: `body { overflow-x: hidden }` promotes
    // it, so window.scrollTo does nothing — this hook writes body.scrollTop directly).
    const { scrollIntoView, targetRef } = useScrollIntoView<HTMLDivElement>({
        offset: HEADER_HEIGHT_PX,
        duration: 500,
    });

    const canViewStatistics = getCanViewStatistics();
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

    // Select the group, then bring section 2 up under the fixed header (offset = HEADER_HEIGHT_PX).
    const selectGroup = (uuid: string) => {
        setSelectedGroupUuid(uuid);
        scrollIntoView({ alignment: 'start' });
    };

    return (
        <LayoutBase title="Statistiques">
            <div className={classes.container}>
                {isLoading ? <Loader /> : null}
                {error ? <ErrorCard>{error.message}</ErrorCard> : null}
                {summary ? (
                    <Stack gap="xl">
                        <Stack gap="lg">
                            <Text c="dimmed">
                                Activité des groupes utilisateurs du département : {summary.departmentName}
                            </Text>

                            <ActivityDefinitionsInfoCard />

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

                            <SegmentedControl
                                className={classes['granularity-control']}
                                value={granularity}
                                onChange={(value) => setGranularity(value as DdtmActivityGranularity)}
                                data={GRANULARITY_OPTIONS}
                            />

                            <DataTable<DdtmActivityUserGroup, undefined>
                                endpoint={ddtmActivityEndpoints.userGroups}
                                paginated={false}
                                striped={false}
                                highlightOnHover={false}
                                showRefresh={false}
                                layout="auto"
                                tableContainerClassName={classes['bordered-table']}
                                tableHeader={[
                                    <Table.Th key="name">Groupe utilisateur</Table.Th>,
                                    <Table.Th key="deployedSinceWeeks">Déployé depuis</Table.Th>,
                                    <Table.Th key="usersCount">Utilisateurs</Table.Th>,
                                    <Table.Th key="activeUsersCount">Utilisateurs actifs</Table.Th>,
                                    <Table.Th key="pilotUsersCount">Utilisateurs pilotes</Table.Th>,
                                ]}
                                tableBodyRenderFns={[
                                    (group: DdtmActivityUserGroup) => (
                                        <Anchor
                                            component="button"
                                            type="button"
                                            ta="left"
                                            onClick={() => selectGroup(group.uuid)}
                                        >
                                            {group.name}
                                        </Anchor>
                                    ),
                                    (group: DdtmActivityUserGroup) => {
                                        if (group.deploymentDate === null) {
                                            return '—';
                                        }
                                        const weeks = group.deployedSinceWeeks ?? 0;
                                        return (
                                            <Tooltip label={`Déployé le ${formatDateOnly(group.deploymentDate)}`}>
                                                <span>
                                                    {weeks} semaine{weeks > 1 ? 's' : ''}
                                                </span>
                                            </Tooltip>
                                        );
                                    },
                                    (group: DdtmActivityUserGroup) => (
                                        <Badge variant="light" radius="sm" color="gray">
                                            {group.usersCount}
                                        </Badge>
                                    ),
                                    (group: DdtmActivityUserGroup) => (
                                        <Badge variant="light" radius="sm" color={ACTIVITY_TIERS.ACTIVE.color}>
                                            {group.activeUsersCount}
                                        </Badge>
                                    ),
                                    (group: DdtmActivityUserGroup) => (
                                        <Badge variant="light" radius="sm" color={ACTIVITY_TIERS.PILOT.color}>
                                            {group.pilotUsersCount}
                                        </Badge>
                                    ),
                                ]}
                            />

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
                                <GroupCharts
                                    key={selectedGroupUuid}
                                    userGroupUuid={selectedGroupUuid}
                                    granularity={granularity}
                                />
                            ) : (
                                <Text c="dimmed" size="sm">
                                    Sélectionnez un groupe utilisateur pour afficher son activité.
                                </Text>
                            )}
                        </Stack>
                    </Stack>
                ) : null}
            </div>
        </LayoutBase>
    );
};

export default Component;
