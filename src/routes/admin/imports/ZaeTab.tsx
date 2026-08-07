import React from 'react';

import { dataDeploymentEndpoints } from '@/api/endpoints/admin';
import DataTable from '@/components/DataTable';
import borderedClasses from '@/components/DataTable/borderedContainer.module.scss';
import SoloAccordion from '@/components/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { DataDeploymentZaeGroup } from '@/models/data-deployment';
import { ActionIcon, Group, Input, Stack, Table, Text, Tooltip } from '@mantine/core';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import { DeployStatusBadge, ItemDeployButton } from './shared';

interface DataFilter {
    q: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
};

const ExpandedContent: React.FC<{ group: DataDeploymentZaeGroup }> = ({ group }) => (
    <Stack gap="lg" py="md">
        {group.zaeLayers.length === 0 ? (
            <Text c="dimmed" size="sm">
                Aucune zone à enjeux
            </Text>
        ) : (
            <div className={borderedClasses.container}>
                <Table layout="fixed">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Date création</Table.Th>
                            <Table.Th>Zone à enjeux</Table.Th>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Année</Table.Th>
                            <Table.Th>Statut déploiement</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {group.zaeLayers.map((zaeLayer) => (
                            <Table.Tr key={zaeLayer.id}>
                                <Table.Td>{zaeLayer.createdAt ? <DateInfo date={zaeLayer.createdAt} /> : '—'}</Table.Td>
                                <Table.Td>{zaeLayer.name ?? '—'}</Table.Td>
                                <Table.Td>{zaeLayer.typeName ?? zaeLayer.type ?? '—'}</Table.Td>
                                <Table.Td>{zaeLayer.year ?? '—'}</Table.Td>
                                <Table.Td>
                                    <DeployStatusBadge status={zaeLayer.deployStatus} />
                                </Table.Td>
                                <Table.Td>
                                    <Group justify="flex-end">
                                        <ItemDeployButton
                                            endpoint={
                                                group.geozoneId
                                                    ? dataDeploymentEndpoints.runZae(
                                                          String(group.geozoneId),
                                                          zaeLayer.id,
                                                      )
                                                    : null
                                            }
                                            kind="zae"
                                            name={zaeLayer.name}
                                            deployable={zaeLayer.deployStatus === 'NOT_DEPLOYED'}
                                        />
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </div>
        )}
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
                    <Input
                        placeholder="Rechercher une zone à enjeux"
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
