import React from 'react';

import { dataDeploymentEndpoints } from '@/api/endpoints/admin';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { DataDeploymentBatchItem } from '@/models/data-deployment';
import { Anchor, Group, Input, Table } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { DeployStatusBadge, ItemDeployButton } from './shared';

interface DataFilter {
    q: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
};

const Component: React.FC = () => {
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);

    return (
        <DataTable<DataDeploymentBatchItem, DataFilter>
            endpoint={dataDeploymentEndpoints.batches}
            filter={filter}
            layout="auto"
            SoloAccordion={
                <SoloAccordion indicatorShown={!!filter.q}>
                    <Input
                        placeholder="Rechercher un batch"
                        leftSection={<IconSearch size={16} />}
                        value={filter.q}
                        onChange={(event) => {
                            const value = event.currentTarget.value;
                            setFilter((filter) => ({ ...filter, q: value }));
                        }}
                    />
                </SoloAccordion>
            }
            tableHeader={[
                <Table.Th key="createdAt">Date création</Table.Th>,
                <Table.Th key="name">Batch</Table.Th>,
                <Table.Th key="geozone">Collectivité</Table.Th>,
                <Table.Th key="tilesUrl">Fond de carte</Table.Th>,
                <Table.Th key="status">Statut déploiement</Table.Th>,
                <Table.Th key="actions" />,
            ]}
            tableBodyRenderFns={[
                (item: DataDeploymentBatchItem) => (item.createdAt ? <DateInfo date={item.createdAt} /> : '—'),
                (item: DataDeploymentBatchItem) => item.name ?? '—',
                (item: DataDeploymentBatchItem) => item.geozoneName ?? '—',
                (item: DataDeploymentBatchItem) =>
                    item.tilesUrl ? (
                        <Anchor href={item.tilesUrl} target="_blank" size="sm" style={{ wordBreak: 'break-all' }}>
                            {item.tilesUrl}
                        </Anchor>
                    ) : (
                        '—'
                    ),
                (item: DataDeploymentBatchItem) => <DeployStatusBadge status={item.deployStatus} />,
                (item: DataDeploymentBatchItem) => (
                    <Group justify="flex-end">
                        <ItemDeployButton
                            endpoint={
                                item.geozoneId
                                    ? dataDeploymentEndpoints.runBatch(String(item.geozoneId), item.id)
                                    : null
                            }
                            kind="batch"
                            name={item.name}
                            deployable={item.deployStatus === 'NOT_DEPLOYED'}
                        />
                    </Group>
                ),
            ]}
        />
    );
};

export default Component;
