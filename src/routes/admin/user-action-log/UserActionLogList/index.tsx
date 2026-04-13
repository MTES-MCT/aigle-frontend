import React, { useState } from 'react';

import { userActionLogEndpoints } from '@/api/endpoints';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import DateInfo from '@/components/ui/DateInfo';
import { UserActionLog, UserActionLogAction, userActionLogActions } from '@/models/user-action-log';
import { Badge, Checkbox, Code, Input, Stack, Table } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import isEqual from 'lodash/isEqual';

interface DataFilter {
    route: string;
    actions: UserActionLogAction[];
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    route: '',
    actions: [...userActionLogActions].sort(),
};

const ACTION_LABELS: Record<UserActionLogAction, string> = {
    CREATE: 'Création',
    UPDATE: 'Mise à jour',
    PARTIAL_UPDATE: 'Mise à jour partielle',
    DESTROY: 'Suppression',
    CUSTOM: 'Personnalisée',
};

const ACTION_COLORS: Record<UserActionLogAction, string> = {
    CREATE: 'green',
    UPDATE: 'blue',
    PARTIAL_UPDATE: 'cyan',
    DESTROY: 'red',
    CUSTOM: 'gray',
};

const formatData = (data: unknown): string => {
    if (data === null || data === undefined) {
        return '—';
    }
    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
};

const Component: React.FC = () => {
    const [filter, setFilter] = useState<DataFilter>(DATA_FILTER_INITIAL_VALUE);

    return (
        <LayoutAdminBase title="Journal des actions">
            <DataTable<UserActionLog, DataFilter>
                endpoint={userActionLogEndpoints.list}
                filter={filter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder="Rechercher une route"
                            leftSection={<IconSearch size={16} />}
                            value={filter.route}
                            onChange={(event) => {
                                const value = event.currentTarget.value;
                                setFilter((filter) => ({
                                    ...filter,
                                    route: value,
                                }));
                            }}
                        />

                        <Checkbox.Group
                            label="Actions"
                            value={filter.actions}
                            onChange={(actions) => {
                                setFilter((filter) => ({
                                    ...filter,
                                    actions: (actions as UserActionLogAction[]).sort(),
                                }));
                            }}
                        >
                            <Stack gap={0}>
                                {userActionLogActions.map((action) => (
                                    <Checkbox mt="xs" key={action} value={action} label={ACTION_LABELS[action]} />
                                ))}
                            </Stack>
                        </Checkbox.Group>
                    </SoloAccordion>
                }
                tableHeader={[
                    <Table.Th key="createdAt">Date</Table.Th>,
                    <Table.Th key="user">Utilisateur</Table.Th>,
                    <Table.Th key="action">Action</Table.Th>,
                    <Table.Th key="route">Route</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: UserActionLog) => <DateInfo date={item.createdAt} />,
                    (item: UserActionLog) => item.user?.email ?? '—',
                    (item: UserActionLog) => (
                        <Badge color={ACTION_COLORS[item.action]} variant="light">
                            {ACTION_LABELS[item.action]}
                        </Badge>
                    ),
                    (item: UserActionLog) => <Code>{item.route}</Code>,
                ]}
                getExpandedContent={(item: UserActionLog) => (
                    <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {formatData(item.data)}
                    </Code>
                )}
            />
        </LayoutAdminBase>
    );
};

export default Component;
