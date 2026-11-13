import React from 'react';

import { dataDeploymentEndpoints } from '@/api/endpoints/admin';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { DataDeploymentZaeGroup } from '@/models/data-deployment';
import { ActionIcon, Stack, Table, Tooltip } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { ZaeLayersTable } from './DeploymentTables';
import { SearchInput } from './shared';

interface DataFilter {
    q: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
};

const ExpandedContent: React.FC<{ group: DataDeploymentZaeGroup }> = ({ group }) => (
    <Stack gap="lg" py="md">
        <ZaeLayersTable
            title=""
            zaeLayers={group.zaeLayers}
            zaeEndpoint={(zaeId) =>
                group.geozoneId ? dataDeploymentEndpoints.runZae(String(group.geozoneId), zaeId) : null
            }
        />
    </Stack>
);

const Component: React.FC = () => {
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);

    return (
        <DataTable<DataDeploymentZaeGroup, DataFilter>
            endpoint={dataDeploymentEndpoints.zae}
            filter={filter}
            striped={false}
            highlightOnHover={false}
            layout="auto"
            SoloAccordion={
                <SoloAccordion indicatorShown={!!filter.q}>
                    <SearchInput
                        placeholder="Rechercher une zone à enjeux, un département, un id…"
                        matches={[
                            'nom de la zone à enjeux',
                            'type (code ou libellé, ex. « inondables »)',
                            'id de la zone à enjeux',
                            'nom ou code du département (toutes ses zones)',
                        ]}
                        value={filter.q}
                        onChange={(q) => setFilter((filter) => ({ ...filter, q }))}
                    />
                </SoloAccordion>
            }
            tableHeader={[
                <Table.Th key="departmentCode">Code département</Table.Th>,
                <Table.Th key="departmentName">Département</Table.Th>,
                <Table.Th key="count">Zones à enjeux</Table.Th>,
                <Table.Th key="actions" />,
            ]}
            tableBodyRenderFns={[
                (item: DataDeploymentZaeGroup) => item.departmentCode,
                // null when the department isn't in the app yet — its zae can't be deployed
                (item: DataDeploymentZaeGroup) => item.departmentName ?? '—',
                (item: DataDeploymentZaeGroup) => item.zaeLayers.length,
                () => (
                    <Tooltip label="Afficher les zones à enjeux">
                        <ActionIcon variant="subtle">
                            <IconChevronDown size={16} />
                        </ActionIcon>
                    </Tooltip>
                ),
            ]}
            getExpandedContent={(item: DataDeploymentZaeGroup) => <ExpandedContent group={item} />}
        />
    );
};

export default Component;
