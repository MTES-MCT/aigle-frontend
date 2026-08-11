import { SortableTableColumn } from '@/components/SortableTable';
import { DdtmActivityUser, DdtmActivityUserGroup } from '@/models/ddtm-activity';
import { formatDateOnly } from '@/utils/format';
import { Anchor } from '@mantine/core';
import { ACTIVITY_TIERS, ACTIVITY_TIER_ORDER, sumBy } from './activity';
import { ActivityBadge, CountBadge } from './tierUi';

export const buildGroupColumns = (
    onGroupSelected: (uuid: string) => void,
): SortableTableColumn<DdtmActivityUserGroup>[] => [
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
        // `value` stays ISO so sorting and the CSV export keep working; the report reads
        // `displayValue`.
        value: (group) => group.deploymentDate,
        displayValue: (group) => (group.deploymentDate ? formatDateOnly(group.deploymentDate) : null),
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
        // gray.7, not the plain `gray`: Mantine's gray-filled is a mid grey, and white on
        // it does not clear the text-contrast floor
        render: (group) => <CountBadge count={group.usersCount} color="gray.7" />,
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

export const USER_COLUMNS: SortableTableColumn<DdtmActivityUser>[] = [
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
