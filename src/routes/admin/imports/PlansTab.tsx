import React from 'react';

import { dataDeploymentEndpoints } from '@/api/endpoints/admin';
import DataTable from '@/components/DataTable';
import borderedClasses from '@/components/DataTable/borderedContainer.module.scss';
import SoloAccordion from '@/components/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { DataDeploymentPlan } from '@/models/data-deployment';
import { ActionIcon, Badge, Stack, Table, Text, Title, Tooltip } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import DeployDataButton from './DeployDataButton';
import { BatchesTable, ZaeLayersTable } from './DeploymentTables';
import { DeployStatusBadge, ID_COLUMN_WIDTH, SearchInput } from './shared';

interface DataFilter {
    q: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
};

// ML pipeline statuses (plan and run); an unknown one is shown as is
const PIPELINE_STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'orange' },
    running: { label: 'En cours', color: 'blue' },
    done: { label: 'Terminé', color: 'green' },
    error: { label: 'Erreur', color: 'red' },
    failed: { label: 'Erreur', color: 'red' },
};

const PipelineStatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
    if (!status) {
        return '—';
    }
    const known = PIPELINE_STATUS[status.toLowerCase()];
    return (
        <Badge variant="light" color={known?.color ?? 'gray'}>
            {known?.label ?? status}
        </Badge>
    );
};

const PLAN_TYPES: Record<string, string> = {
    detection: 'Détection',
    segmentation: 'Segmentation',
};

const GEOZONE_TYPES: Record<string, string> = {
    COMMUNE: 'Commune',
    EPCI: 'EPCI',
    DEPARTMENT: 'Département',
};

const GeozoneCell: React.FC<{ plan: DataDeploymentPlan }> = ({ plan }) =>
    plan.geozoneName ? (
        <div>
            <Text size="sm">
                {plan.geozoneName} {plan.geozoneCode ? `(${plan.geozoneCode})` : null}
            </Text>
            {plan.geozoneType ? (
                <Text size="xs" c="dimmed">
                    {GEOZONE_TYPES[plan.geozoneType] ?? plan.geozoneType}
                </Text>
            ) : null}
        </div>
    ) : (
        <div>
            <Text size="sm">{plan.geozoneCode ?? '—'}</Text>
            <Text size="xs" c="dimmed">
                Absente de l’application
            </Text>
        </div>
    );

const RunsTable: React.FC<{ plan: DataDeploymentPlan }> = ({ plan }) => (
    <div>
        <Title order={5} mb="xs">
            Runs
        </Title>
        {plan.runs.length === 0 ? (
            <Text c="dimmed" size="sm">
                Aucun run : le plan n’a pas encore été traité par le pipeline.
            </Text>
        ) : (
            <div className={borderedClasses.container}>
                <Table layout="fixed">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th w={ID_COLUMN_WIDTH}>Id</Table.Th>
                            <Table.Th>Date création</Table.Th>
                            <Table.Th>Run</Table.Th>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Année image</Table.Th>
                            <Table.Th>Statut</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {plan.runs.map((run) => (
                            <Table.Tr key={run.id}>
                                <Table.Td>{run.id}</Table.Td>
                                <Table.Td>{run.createdAt ? <DateInfo date={run.createdAt} /> : '—'}</Table.Td>
                                <Table.Td style={{ wordBreak: 'break-all' }}>{run.name ?? '—'}</Table.Td>
                                <Table.Td>{run.type ?? '—'}</Table.Td>
                                <Table.Td>{run.year ?? '—'}</Table.Td>
                                <Table.Td>
                                    <PipelineStatusBadge status={run.status} />
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </div>
        )}
    </div>
);

const ExpandedContent: React.FC<{ plan: DataDeploymentPlan }> = ({ plan }) => {
    const geozoneId = plan.geozoneId === null ? null : String(plan.geozoneId);

    return (
        <Stack gap="lg" py="md">
            <DeployDataButton
                label="Déployer le plan"
                endpoint={geozoneId ? dataDeploymentEndpoints.runPlan(plan.id) : null}
                unavailableReason={`Aucune collectivité de l’application ne correspond au code ${plan.geozoneCode ?? '—'}`}
                targetName={plan.geozoneName}
                batches={plan.batches}
                zaeLayers={plan.zaeLayers}
            />
            <RunsTable plan={plan} />
            <BatchesTable
                batches={plan.batches}
                batchEndpoint={(batchId) => (geozoneId ? dataDeploymentEndpoints.runBatch(geozoneId, batchId) : null)}
                pickGeozoneEndpoint={dataDeploymentEndpoints.runBatchOnGeozone}
                geozoneName={plan.geozoneName}
            />
            <ZaeLayersTable
                title={plan.departmentName ? `Zones à enjeux (${plan.departmentName})` : undefined}
                zaeLayers={plan.zaeLayers}
                zaeEndpoint={(zaeId) => (geozoneId ? dataDeploymentEndpoints.runZae(geozoneId, zaeId) : null)}
            />
        </Stack>
    );
};

const Component: React.FC = () => {
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);

    return (
        <DataTable<DataDeploymentPlan, DataFilter>
            endpoint={dataDeploymentEndpoints.plans}
            filter={filter}
            striped={false}
            highlightOnHover={false}
            layout="auto"
            SoloAccordion={
                <SoloAccordion indicatorShown={!!filter.q}>
                    <SearchInput
                        placeholder="Rechercher un plan, une collectivité, un id…"
                        matches={[
                            'id du plan, de ses runs ou de ses batches',
                            ...'nom de run ou de batch',
                            'type (detection, segmentation) ou statut du plan',
                        ]}
                        value={filter.q}
                        onChange={(q) => setFilter((filter) => ({ ...filter, q }))}
                    />
                </SoloAccordion>
            }
            tableHeader={[
                <Table.Th key="id">Id</Table.Th>,
                <Table.Th key="createdAt">Date création</Table.Th>,
                <Table.Th key="geozone">Collectivité</Table.Th>,
                <Table.Th key="department">Département</Table.Th>,
                <Table.Th key="type">Type</Table.Th>,
                <Table.Th key="status">Statut plan</Table.Th>,
                <Table.Th key="runs">Runs</Table.Th>,
                <Table.Th key="deployStatus">Statut déploiement</Table.Th>,
                <Table.Th key="actions" />,
            ]}
            tableBodyRenderFns={[
                (item: DataDeploymentPlan) => item.id,
                (item: DataDeploymentPlan) => <DateInfo date={item.createdAt} />,
                (item: DataDeploymentPlan) => <GeozoneCell plan={item} />,
                (item: DataDeploymentPlan) =>
                    item.departmentCode ? `${item.departmentName ?? ''} (${item.departmentCode})`.trim() : '—',
                (item: DataDeploymentPlan) => (item.type ? PLAN_TYPES[item.type] ?? item.type : '—'),
                (item: DataDeploymentPlan) => <PipelineStatusBadge status={item.status} />,
                (item: DataDeploymentPlan) => item.runs.length,
                (item: DataDeploymentPlan) => <DeployStatusBadge status={item.deployStatus} />,
                () => (
                    <Tooltip label="Afficher les runs, batches et zones à enjeux">
                        <ActionIcon variant="subtle">
                            <IconChevronDown size={16} />
                        </ActionIcon>
                    </Tooltip>
                ),
            ]}
            getExpandedContent={(item: DataDeploymentPlan) => <ExpandedContent plan={item} />}
        />
    );
};

export default Component;
