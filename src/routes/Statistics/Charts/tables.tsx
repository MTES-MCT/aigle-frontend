import { ddtmActivityEndpoints } from '@/api/endpoints';
import SortableTable from '@/components/SortableTable';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { DdtmActivityUser, DdtmActivityUserGroup } from '@/models/ddtm-activity';
import api from '@/utils/api';
import { toFileSlug } from '@/utils/download';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { USER_COLUMNS, buildGroupColumns } from './tableColumns';

const GROUPS_TABLE_PAGE_SIZE = 20;

/** Every collectivity group of the supervised territory. */
export const GroupsTable: React.FC<{ onGroupSelected: (uuid: string) => void }> = ({ onGroupSelected }) => {
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
            // paginated on screen only: the CSV and the PDF are built from the full list
            pageSize={GROUPS_TABLE_PAGE_SIZE}
        />
    );
};

/** The members of one group. DDTM-only — the API serves it on a DDTM route. */
export const GroupUsersTable: React.FC<{ userGroupUuid: string; groupName: string }> = ({
    userGroupUuid,
    groupName,
}) => {
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
