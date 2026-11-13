import React from 'react';

import { dataDeploymentEndpoints } from '@/api/endpoints/admin';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { DataDeploymentRun } from '@/models/data-deployment';
import { ActionIcon, Stack, Table, Tooltip } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconChevronDown } from '@tabler/icons-react';
import { format, isValid, parse } from 'date-fns';
import isEqual from 'lodash/isEqual';
import DeployDataButton from './DeployDataButton';
import { BatchesTable, ZaeLayersTable } from './DeploymentTables';
import { SearchInput } from './shared';

interface DataFilter {
    q: string;
    batchCreatedAtMin: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    batchCreatedAtMin: '',
};

const ExpandedContent: React.FC<{ run: DataDeploymentRun }> = ({ run }) => (
    <Stack gap="lg" py="md">
        <DeployDataButton
            endpoint={dataDeploymentEndpoints.run(run.uuid)}
            targetName={run.geozoneName}
            batches={run.batches}
            zaeLayers={run.zaeLayers}
        />
        <BatchesTable
            batches={run.batches}
            batchEndpoint={(batchId) => dataDeploymentEndpoints.runBatch(run.uuid, batchId)}
        />
        <ZaeLayersTable
            zaeLayers={run.zaeLayers}
            zaeEndpoint={(zaeId) => dataDeploymentEndpoints.runZae(run.uuid, zaeId)}
        />
    </Stack>
);

const Component: React.FC = () => {
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);

    // guard like onChange does — a hand-edited URL (?batchCreatedAtMin=foo) parses to an
    // Invalid Date (truthy), which would feed a broken value into DateInput
    const parsedMin = filter.batchCreatedAtMin ? parse(filter.batchCreatedAtMin, 'yyyy-MM-dd', new Date()) : null;
    const batchCreatedAtMinDate = parsedMin && isValid(parsedMin) ? parsedMin : null;

    return (
        <DataTable<DataDeploymentRun, DataFilter>
            endpoint={dataDeploymentEndpoints.list}
            filter={filter}
            striped={false}
            highlightOnHover={false}
            layout="auto"
            SoloAccordion={
                <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                    <SearchInput
                        placeholder="Rechercher une collectivité, un batch, un id…"
                        matches={[...'nom ou url de fond de carte d’un batch', 'id de run, de batch ou de plan']}
                        value={filter.q}
                        onChange={(q) => setFilter((filter) => ({ ...filter, q }))}
                    />
                    <DateInput
                        label="Date de création (minimum)"
                        placeholder="Sélectionner une date"
                        clearable
                        valueFormat="DD/MM/YYYY"
                        dateParser={(value: string) => parse(value, 'dd/MM/yyyy', new Date())}
                        value={batchCreatedAtMinDate}
                        onChange={(date) => {
                            setFilter((filter) => ({
                                ...filter,
                                // a free-typed invalid date parses to an Invalid Date (truthy) — guard it
                                batchCreatedAtMin: date && isValid(date) ? format(date, 'yyyy-MM-dd') : '',
                            }));
                        }}
                    />
                </SoloAccordion>
            }
            tableHeader={[
                <Table.Th key="createdAt">Date création</Table.Th>,
                <Table.Th key="run">Run</Table.Th>,
                <Table.Th key="runIds">Ids run</Table.Th>,
                <Table.Th key="actions" />,
            ]}
            tableBodyRenderFns={[
                // createdAt is MAX(run.created_at) and can be null — guard like the nested rows do
                (item: DataDeploymentRun) => (item.createdAt ? <DateInfo date={item.createdAt} /> : '—'),
                (item: DataDeploymentRun) => item.geozoneName ?? '—',
                (item: DataDeploymentRun) => item.runIds.join(', '),
                () => (
                    <Tooltip label="Afficher les batches et zones à enjeux">
                        <ActionIcon variant="subtle">
                            <IconChevronDown size={16} />
                        </ActionIcon>
                    </Tooltip>
                ),
            ]}
            getExpandedContent={(item: DataDeploymentRun) => <ExpandedContent run={item} />}
        />
    );
};

export default Component;
