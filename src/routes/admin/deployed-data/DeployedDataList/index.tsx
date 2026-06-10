import React from 'react';

import { deployedDataEndpoints } from '@/api/endpoints';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import { useFilterNavigation } from '@/hooks/useFilterNavigation';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { DeployedDataDepartmentSummary } from '@/models/deployed-data';
import { Badge, Group, Input, NumberInput, Stack, Table, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import isEqual from 'lodash/isEqual';
import classes from './index.module.scss';

interface DataFilter {
    q: string;
    minCommuneDetections: string;
}

// Communes below this many detections are hidden by default (noise reduction).
const DEFAULT_MIN_COMMUNE_DETECTIONS = '50';

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    minCommuneDetections: DEFAULT_MIN_COMMUNE_DETECTIONS,
};

const Component: React.FC = () => {
    const { navigate } = useFilterNavigation();
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);

    return (
        <LayoutAdminBase title="Données déployées">
            <div className={classes.container}>
                <DataTable<DeployedDataDepartmentSummary, DataFilter>
                    endpoint={deployedDataEndpoints.list}
                    filter={filter}
                    paginated={false}
                    layout="auto"
                    // Navigate (instead of <Link>) so the active filter stays on the URL and is
                    // carried onto the detail page (which reads minCommuneDetections from it).
                    onItemClick={({ uuid }) => navigate(`/admin/deployed-data/${uuid}`)}
                    SoloAccordion={
                        <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                            <Stack>
                                <Input
                                    placeholder="Rechercher un département"
                                    leftSection={<IconSearch size={16} />}
                                    value={filter.q}
                                    onChange={(event) => {
                                        const value = event.currentTarget.value;
                                        setFilter((filter) => ({
                                            ...filter,
                                            q: value,
                                        }));
                                    }}
                                />
                                <NumberInput
                                    label="Détections minimum par commune"
                                    description="Exclut les communes en-dessous de ce seuil (ex : 50)"
                                    placeholder="0"
                                    min={0}
                                    allowDecimal={false}
                                    value={filter.minCommuneDetections}
                                    onChange={(value) => {
                                        setFilter((filter) => ({
                                            ...filter,
                                            minCommuneDetections: value === '' ? '' : String(value),
                                        }));
                                    }}
                                />
                            </Stack>
                        </SoloAccordion>
                    }
                    tableHeader={[
                        <Table.Th key="name">Département</Table.Th>,
                        <Table.Th key="communes">Nombre de communes déployées</Table.Th>,
                        <Table.Th key="users">Nombre d&apos;utilisateurs</Table.Th>,
                        <Table.Th key="tileSets">Fonds de carte</Table.Th>,
                    ]}
                    tableBodyRenderFns={[
                        (item: DeployedDataDepartmentSummary) => <Text fw={600}>{item.name}</Text>,
                        (item: DeployedDataDepartmentSummary) => item.communesWithDetectionsCount,
                        (item: DeployedDataDepartmentSummary) => item.usersCount,
                        (item: DeployedDataDepartmentSummary) => {
                            if (!item.tileSetYears.length) {
                                return (
                                    <Text c="dimmed" size="sm">
                                        —
                                    </Text>
                                );
                            }

                            return (
                                <Group gap={4}>
                                    {item.tileSetYears.map((year) => (
                                        <Badge key={year} variant="light" radius="sm">
                                            {year}
                                        </Badge>
                                    ))}
                                </Group>
                            );
                        },
                    ]}
                />
            </div>
        </LayoutAdminBase>
    );
};

export default Component;
