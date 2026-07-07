import React, { useState } from 'react';

import { ddtmActivityEndpoints } from '@/api/endpoints';
import DataTable from '@/components/DataTable';
import LayoutBase from '@/components/LayoutBase';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import StatTile from '@/components/ui/StatTile';
import {
    DdtmActivityCountMonth,
    DdtmActivitySummary,
    DdtmActivityUser,
    DdtmActivityUserGroup,
    DdtmActivityUserGroupMonthly,
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
import { BarChart } from '@mantine/charts';
import { Anchor, Badge, Select, SimpleGrid, Stack, Table, Text, Tooltip } from '@mantine/core';
import { useScrollIntoView } from '@mantine/hooks';
import { IconChartBar, IconUsersGroup } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import classes from './index.module.scss';

// Plain grey hover cursor instead of Mantine's default dashed-outline rectangle.
const CHART_TOOLTIP_PROPS = { cursor: { fill: 'var(--mantine-color-gray-2)', stroke: 'none' } };

// Gray is a deliberate "rest" color for inactive; pilot/active carry the accessible hues
// (status is also encoded in the legend + table).
const ACTIVITY_STATUSES: Record<UserActivityStatus, { label: string; color: string }> = {
    PILOT: { label: 'Pilote', color: 'blue.7' },
    ACTIVE: { label: 'Actif', color: 'teal.8' },
    INACTIVE: { label: 'Inactif', color: 'gray.6' },
};

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

// "YYYY-MM" -> "janv. 2026" — pure string manipulation, timezone-proof.
const formatMonth = (month: string): string => {
    const [year, monthNumber] = month.split('-');
    return `${MONTH_LABELS[Number(monthNumber) - 1]} ${year}`;
};

const ActivityBadge: React.FC<{ status: UserActivityStatus }> = ({ status }) => (
    <Badge variant="light" radius="sm" color={ACTIVITY_STATUSES[status].color}>
        {ACTIVITY_STATUSES[status].label}
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

const CountBarChart: React.FC<{ title: string; months: DdtmActivityCountMonth[]; label: string; color: string }> = ({
    title,
    months,
    label,
    color,
}) => (
    <ChartSection title={title}>
        <BarChart
            h={280}
            data={months.map((month) => ({ month: formatMonth(month.month), count: month.count }))}
            dataKey="month"
            series={[{ name: 'count', label, color }]}
            yAxisProps={{ allowDecimals: false }}
            tooltipProps={CHART_TOOLTIP_PROPS}
        />
    </ChartSection>
);

const GroupCharts: React.FC<{ userGroupUuid: string }> = ({ userGroupUuid }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: [ddtmActivityEndpoints.userGroupMonthly(userGroupUuid)],
        queryFn: ({ signal }) =>
            api<DdtmActivityUserGroupMonthly>(ddtmActivityEndpoints.userGroupMonthly(userGroupUuid), { signal }),
    });

    if (isLoading) {
        return <Loader />;
    }
    if (error || !data) {
        return <ErrorCard>{error ? error.message : 'Aucune donnée'}</ErrorCard>;
    }

    // Only chart the control statuses that actually occurred, reusing the app's status
    // colors/labels so the chart matches the rest of the app.
    const presentStatuses = new Set(
        data.controlStatusChangesByMonth.flatMap((month) => month.counts.map((c) => c.status)),
    );
    const controlStatusSeries = CONTROL_STATUS_ORDER.filter((status) => presentStatuses.has(status)).map((status) => ({
        name: status,
        label: DETECTION_CONTROL_STATUSES_NAMES_MAP[status],
        color: DETECTION_CONTROL_STATUSES_COLORS_MAP[status],
    }));

    return (
        <Stack gap="xl">
            <ChartSection title="Activité mensuelle des utilisateurs">
                <BarChart
                    h={320}
                    data={data.months.map((month) => ({
                        month: formatMonth(month.month),
                        pilotUsersCount: month.pilotUsersCount,
                        activeUsersCount: month.activeUsersCount,
                        inactiveUsersCount: month.inactiveUsersCount,
                    }))}
                    dataKey="month"
                    type="stacked"
                    // Array order = bottom-to-top in the stack: pilots, then actives, then inactives.
                    series={[
                        {
                            name: 'pilotUsersCount',
                            label: 'Utilisateurs pilotes',
                            color: ACTIVITY_STATUSES.PILOT.color,
                        },
                        {
                            name: 'activeUsersCount',
                            label: 'Utilisateurs actifs',
                            color: ACTIVITY_STATUSES.ACTIVE.color,
                        },
                        {
                            name: 'inactiveUsersCount',
                            label: 'Utilisateurs inactifs',
                            color: ACTIVITY_STATUSES.INACTIVE.color,
                        },
                    ]}
                    withLegend
                    yAxisProps={{ allowDecimals: false }}
                    tooltipProps={CHART_TOOLTIP_PROPS}
                />
            </ChartSection>

            <ChartSection title="Changements de statut de contrôle par mois">
                {controlStatusSeries.length ? (
                    <BarChart
                        h={320}
                        data={data.controlStatusChangesByMonth.map((month) => ({
                            month: formatMonth(month.month),
                            ...Object.fromEntries(month.counts.map((c) => [c.status, c.count])),
                        }))}
                        dataKey="month"
                        type="stacked"
                        series={controlStatusSeries}
                        withLegend
                        yAxisProps={{ allowDecimals: false }}
                        tooltipProps={CHART_TOOLTIP_PROPS}
                    />
                ) : (
                    <Text c="dimmed" size="sm">
                        Aucun changement de statut de contrôle sur la période.
                    </Text>
                )}
            </ChartSection>

            <CountBarChart
                title="Téléchargements de rapport par mois"
                months={data.reportDownloadsByMonth}
                label="Téléchargements"
                color="grape.6"
            />
            <CountBarChart
                title="Connexions par mois"
                months={data.connectionsByMonth}
                label="Connexions"
                color="blue.6"
            />
        </Stack>
    );
};

const Component: React.FC = () => {
    const { getCanViewStatistics } = useAuth();
    const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(null);
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
                                        <Badge variant="light" radius="sm" color={ACTIVITY_STATUSES.ACTIVE.color}>
                                            {group.activeUsersCount}
                                        </Badge>
                                    ),
                                    (group: DdtmActivityUserGroup) => (
                                        <Badge variant="light" radius="sm" color={ACTIVITY_STATUSES.PILOT.color}>
                                            {group.pilotUsersCount}
                                        </Badge>
                                    ),
                                ]}
                            />
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
                                <Stack gap="xl" key={selectedGroupUuid}>
                                    <GroupCharts userGroupUuid={selectedGroupUuid} />
                                    <GroupUsersTable userGroupUuid={selectedGroupUuid} />
                                </Stack>
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
