import React, { useState } from 'react';

import { ddtmActivityEndpoints } from '@/api/endpoints';
import LayoutBase from '@/components/LayoutBase';
import ErrorCard from '@/components/ui/ErrorCard';
import InfoCard from '@/components/ui/InfoCard';
import Loader from '@/components/ui/Loader';
import StatTile from '@/components/ui/StatTile';
import {
    DdtmActivityGranularity,
    DdtmActivityGroupsActivity,
    DdtmActivitySummary,
    DdtmActivityUserGroupActivity,
    DdtmActivityUserGroupOption,
} from '@/models/ddtm-activity';
import { useAuth } from '@/store/slices/auth';
import api from '@/utils/api';
import { HEADER_HEIGHT_PX } from '@/utils/constants';
import { formatDateOnly } from '@/utils/format';
import { Button, Group, List, SegmentedControl, Select, SimpleGrid, Stack, Text } from '@mantine/core';
import { useScrollIntoView } from '@mantine/hooks';
import { IconChartBar, IconFileTypePdf, IconUsersGroup } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Navigate } from 'react-router-dom';
import {
    ACTIVITY_TIERS,
    ACTIVITY_TIER_ORDER,
    GRANULARITY_OPTIONS,
    NO_GROUP_DEPLOYED_MESSAGE,
    buildNoDataLabels,
    formatPeriod,
    groupsByTier,
} from './activity';
import { SeriesToggle } from './chartConfig';
import { ActivityChart, ControlStatusChart, CountBarChart } from './charts';
import classes from './index.module.scss';
import PeriodBreakdown from './PeriodBreakdown';
import { ReportSources, useReportDownload } from './report';
import { REPORT_GROUP_SECTION_ATTRIBUTE, ReportScopeContext, usePublishReportScope } from './report/context';
import { USER_COLUMNS, buildGroupColumns } from './tableColumns';
import { GroupUsersTable, GroupsTable } from './tables';
import { TierSwatch } from './tierUi';

/** The territory-wide chart, and the detail of whichever period the reader clicks. */
const GroupsActivityChart: React.FC<{
    granularity: DdtmActivityGranularity;
    selectedGroupUuid: string | null;
    onGroupSelected: (uuid: string) => void;
}> = ({ granularity, selectedGroupUuid, onGroupSelected }) => {
    const [clickedPeriod, setClickedPeriod] = useState<string | null>(null);
    // Owned here rather than inside the chart: the period detail below mirrors it, so a
    // category switched off in the legend closes its section, and closing a section hides
    // the category.
    const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
    const seriesToggle: SeriesToggle = {
        hiddenSeries,
        toggle: (name) =>
            setHiddenSeries((previous) => {
                const next = new Set(previous);
                next.has(name) ? next.delete(name) : next.add(name);
                return next;
            }),
    };
    const { data, isLoading, error } = useQuery({
        queryKey: [ddtmActivityEndpoints.groupsActivity, granularity],
        queryFn: ({ signal }) =>
            api<DdtmActivityGroupsActivity>(ddtmActivityEndpoints.groupsActivity, {
                params: { granularity },
                signal,
            }),
    });

    // Switching granularity renames every period, so the previous pick no longer exists.
    // Deriving it from the data drops it without an effect chasing the query.
    const selectedPeriod =
        clickedPeriod !== null && data?.activityByPeriod.some((tier) => tier.period === clickedPeriod)
            ? clickedPeriod
            : null;

    usePublishReportScope({
        periodBreakdown:
            data && selectedPeriod
                ? {
                      period: formatPeriod(selectedPeriod),
                      tiersByLabel: groupsByTier(data.groups, selectedPeriod).map(({ tier, groups }) => ({
                          label: ACTIVITY_TIERS[tier].label,
                          color: ACTIVITY_TIERS[tier].color,
                          names: groups.map((group) => group.name),
                      })),
                  }
                : null,
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
                emptyMessage={NO_GROUP_DEPLOYED_MESSAGE}
                selectedPeriod={selectedPeriod}
                onPeriodSelect={setClickedPeriod}
                seriesToggle={seriesToggle}
            />
            {selectedPeriod ? (
                <PeriodBreakdown
                    activity={data}
                    period={selectedPeriod}
                    selectedGroupUuid={selectedGroupUuid}
                    onGroupSelected={onGroupSelected}
                    onClose={() => setClickedPeriod(null)}
                    seriesToggle={seriesToggle}
                />
            ) : (
                <Text size="sm" c="dimmed" ta="center" className={classes['no-print']}>
                    Cliquez sur une période du graphique pour voir les groupes de chaque catégorie.
                </Text>
            )}
        </Stack>
    );
};

/**
 * One group in detail. `withUsersTable`: the per-user detail (emails) is reserved for DDTM
 * members — the API serves it on a DDTM-only route.
 */
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
        // the attribute tells the report generator that these charts belong to the
        // "one group in detail" section rather than to the territory overview
        <Stack gap="xl" {...{ [REPORT_GROUP_SECTION_ATTRIBUTE]: '' }}>
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
        {/* same order and same colors as the stacked bars, so the legend reads as the chart */}
        <List size="sm" mt="xs" spacing={4}>
            {ACTIVITY_TIER_ORDER.map((tier) => (
                <List.Item key={tier} icon={<TierSwatch tier={tier} />}>
                    <b>{ACTIVITY_TIERS[tier].label}</b> : {ACTIVITY_TIERS[tier].description}
                </List.Item>
            ))}
        </List>
        <Text size="sm" mt="xs">
            Dans le tableau des groupes, « utilisateurs actifs » regroupe tous les utilisateurs qui ne sont pas inactifs
            : pilotes, récurrents et actifs confondus.
        </Text>
    </InfoCard>
);

const GranularityControl: React.FC<{
    granularity: DdtmActivityGranularity;
    onChange: (granularity: DdtmActivityGranularity) => void;
}> = ({ granularity, onChange }) => (
    <>
        <SegmentedControl
            className={clsx(classes['granularity-control'], classes['no-print'])}
            value={granularity}
            onChange={(value) => onChange(value as DdtmActivityGranularity)}
            data={GRANULARITY_OPTIONS}
        />
        {/* a control is not report content: on paper it becomes the caption of the charts below */}
        <Text size="sm" c="dimmed" ta="center" className={classes['print-only']}>
            Granularité : {GRANULARITY_OPTIONS.find((option) => option.value === granularity)?.label}
        </Text>
    </>
);

/**
 * The top part of every SUPERVISOR dashboard: what the territory is, the legend, the two
 * stat tiles, the groups table and the territory-wide activity chart. Identical for a DDTM
 * (its department) and an EPCI (its member communes) — the API scopes the two tables and the
 * chart to the caller's own territory, so this component needs no notion of which.
 */
const TerritoryOverview: React.FC<{
    summary: DdtmActivitySummary;
    caption: string;
    granularity: DdtmActivityGranularity;
    onGranularityChange: (granularity: DdtmActivityGranularity) => void;
    selectedGroupUuid: string | null;
    onGroupSelected: (uuid: string) => void;
}> = ({ summary, caption, granularity, onGranularityChange, selectedGroupUuid, onGroupSelected }) => (
    <Stack gap="lg">
        <Text c="dimmed">{caption}</Text>

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

        <GroupsTable onGroupSelected={onGroupSelected} />

        {/* Right above the charts it drives — the tables above are not affected. */}
        <GranularityControl granularity={granularity} onChange={onGranularityChange} />

        <GroupsActivityChart
            granularity={granularity}
            selectedGroupUuid={selectedGroupUuid}
            onGroupSelected={onGroupSelected}
        />
    </Stack>
);

/**
 * DDTM and EPCI both supervise a territory: the overview on top, then one of their groups in
 * detail. Only the per-user table (emails) differs — the API serves it on a DDTM route.
 */
const TerritoryDashboard: React.FC<{
    summary: DdtmActivitySummary;
    caption: string;
    withUsersTable: boolean;
}> = ({ summary, caption, withUsersTable }) => {
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

    usePublishReportScope({ caption, granularity, selectedGroupUuid });

    return (
        <Stack gap="xl">
            <TerritoryOverview
                summary={summary}
                caption={caption}
                granularity={granularity}
                onGranularityChange={setGranularity}
                selectedGroupUuid={selectedGroupUuid}
                onGroupSelected={selectGroup}
            />

            {/* the group detail earns its own printed page, but only when there is one:
                without a selection this section is a single sentence */}
            <Stack gap="md" ref={targetRef} className={selectedGroupUuid ? classes['page-break'] : undefined}>
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
                        withUsersTable={withUsersTable}
                    />
                ) : (
                    <Text c="dimmed" size="sm">
                        Sélectionnez un groupe utilisateur pour afficher son activité.
                    </Text>
                )}
            </Stack>
        </Stack>
    );
};

/**
 * Everyone else: their own group's charts only — no territory overview, and no per-user
 * detail (that one is DDTM-only, API included).
 *
 * One set of charts per GROUP, never per commune: the API computes a collectivity's activity
 * for the collectivity as a whole, so a commune selector over a multi-commune group offered
 * a breakdown that does not exist — every commune of the group showed the same numbers.
 */
const OwnGroupDashboard: React.FC<{ groups: DdtmActivityUserGroupOption[] }> = ({ groups }) => {
    const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(groups[0]?.uuid ?? null);
    const [granularity, setGranularity] = useState<DdtmActivityGranularity>('MONTH');
    const selected = groups.find((group) => group.uuid === selectedGroupUuid) ?? groups[0];

    usePublishReportScope({
        caption: selected ? `Activité : ${selected.name}` : '',
        granularity,
        selectedGroupUuid: selected?.uuid ?? null,
    });

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
                    value={selected.uuid}
                    onChange={(value) => value && setSelectedGroupUuid(value)}
                    searchable
                    allowDeselect={false}
                />
            ) : (
                <Text fw={600}>Activité : {selected.name}</Text>
            )}

            <GranularityControl granularity={granularity} onChange={setGranularity} />

            <GroupCharts
                key={selected.uuid}
                userGroupUuid={selected.uuid}
                granularity={granularity}
                withUsersTable={false}
            />
        </Stack>
    );
};

/**
 * Which dashboard the user may see is the API's call, not ours: a department name means
 * "DDTM caller", an EPCI name means "intercommunalité", and neither means "own groups only".
 */
const Dashboard: React.FC<{ summary: DdtmActivitySummary }> = ({ summary }) => {
    if (summary.departmentName !== null) {
        return (
            <TerritoryDashboard
                summary={summary}
                caption={`Activité des groupes utilisateurs du département : ${summary.departmentName}`}
                withUsersTable
            />
        );
    }

    if (summary.epciName !== null) {
        return (
            <TerritoryDashboard
                summary={summary}
                caption={`Activité des groupes utilisateurs de l'EPCI : ${summary.epciName}`}
                withUsersTable={false}
            />
        );
    }

    return <OwnGroupDashboard groups={summary.userGroups} />;
};

// What the report generator needs from this route, handed over rather than imported (the
// generator is imported here, so it cannot import back).
const REPORT_SOURCES: ReportSources = {
    legend: ACTIVITY_TIER_ORDER.map((tier) => ({
        label: ACTIVITY_TIERS[tier].label,
        color: ACTIVITY_TIERS[tier].color,
        description: ACTIVITY_TIERS[tier].description,
    })),
    granularityLabels: Object.fromEntries(GRANULARITY_OPTIONS.map((option) => [option.value, option.label])) as Record<
        DdtmActivityGranularity,
        string
    >,
    groupColumns: buildGroupColumns(() => undefined),
    userColumns: USER_COLUMNS,
};

const Component: React.FC = () => {
    const { getCanViewStatistics } = useAuth();
    const canViewStatistics = getCanViewStatistics();
    const { generating, download, publishScope } = useReportDownload(REPORT_SOURCES);

    // Which dashboard the user may see is the API's call, not ours: a super-admin is scoped
    // to a user group (X-User-Group-Uuid) that the client cannot classify on its own, and
    // only the server knows which groups are readable.
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
                <ReportScopeContext.Provider value={publishScope}>
                    <Stack gap="lg">
                        <Group justify="flex-end">
                            <Button
                                className={classes['no-print']}
                                variant="default"
                                loading={generating}
                                leftSection={<IconFileTypePdf size={16} />}
                                onClick={() => void download()}
                            >
                                Rapport complet (PDF)
                            </Button>
                        </Group>

                        {isLoading ? <Loader /> : null}
                        {error ? <ErrorCard>{error.message}</ErrorCard> : null}
                        {summary ? <Dashboard summary={summary} /> : null}
                    </Stack>
                </ReportScopeContext.Provider>
            </div>
        </LayoutBase>
    );
};

export default Component;
