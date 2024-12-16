import React, { useState } from 'react';

import { TILE_SET_LIST_ENDPOINT } from '@/api-endpoints';
import InfoCard from '@/components/InfoCard';
import DataTable from '@/components/admin/DataTable';
import SoloAccordion from '@/components/admin/SoloAccordion';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import DateInfo from '@/components/ui/DateInfo';
import { TileSetDetail, TileSetScheme, TileSetStatus, tileSetSchemes, tileSetStatuses } from '@/models/tile-set';
import { DEFAULT_DATETIME_FORMAT, TILE_SET_STATUSES_NAMES_MAP, TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import { Button, Checkbox, Input, Stack, Table, Tooltip } from '@mantine/core';
import { IconLink, IconMapPlus, IconSearch, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import isEqual from 'lodash/isEqual';
import { Link, useNavigate } from 'react-router-dom';

interface DataFilter {
    q: string;
    statuses: TileSetStatus[];
    schemes: TileSetScheme[];
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    statuses: [...tileSetStatuses].sort(),
    schemes: [...tileSetSchemes].sort(),
};

const Component: React.FC = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<DataFilter>(DATA_FILTER_INITIAL_VALUE);

    return (
        <LayoutAdminBase
            title="Liste des fonds de carte"
            actions={
                <>
                    <Button leftSection={<IconMapPlus />} component={Link} to="/admin/tile-sets/form">
                        Ajouter un fond de carte
                    </Button>
                </>
            }
        >
            <InfoCard title="Ordre d'affichage des couches">
                <p>
                    Les fonds de carte sont ordonnés selon leur types dans l&apos;ordre suivant (de plus au fond au
                    premier plan): {TILE_SET_TYPES_NAMES_MAP.BACKGROUND}, {TILE_SET_TYPES_NAMES_MAP.PARTIAL},{' '}
                    {TILE_SET_TYPES_NAMES_MAP.INDICATIVE}
                </p>
                <p>
                    Les couches du même type sont ensuite ordonnées du plus ancien (au fond) au plus récent (au premier
                    plan).
                </p>
            </InfoCard>
            <DataTable<TileSetDetail, DataFilter>
                endpoint={TILE_SET_LIST_ENDPOINT}
                filter={filter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder="Rechercher un fond de carte"
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

                        <Checkbox.Group
                            label="Statut"
                            value={filter.statuses}
                            onChange={(statuses) => {
                                setFilter((filter) => ({
                                    ...filter,
                                    statuses: (statuses as TileSetStatus[]).sort(),
                                }));
                            }}
                        >
                            <Stack gap={0}>
                                {tileSetStatuses.map((status) => (
                                    <Checkbox
                                        mt="xs"
                                        key={status}
                                        value={status}
                                        label={TILE_SET_STATUSES_NAMES_MAP[status]}
                                    />
                                ))}
                            </Stack>
                        </Checkbox.Group>

                        <Checkbox.Group
                            label="Schemes"
                            value={filter.schemes}
                            onChange={(schemes) => {
                                setFilter((filter) => ({
                                    ...filter,
                                    schemes: (schemes as TileSetScheme[]).sort(),
                                }));
                            }}
                        >
                            <Stack gap={0}>
                                {tileSetSchemes.map((scheme) => (
                                    <Checkbox mt="xs" key={scheme} value={scheme} label={scheme} />
                                ))}
                            </Stack>
                        </Checkbox.Group>
                    </SoloAccordion>
                }
                tableHeader={[
                    <Table.Th key="id">ID</Table.Th>,
                    <Table.Th key="date">Date</Table.Th>,
                    <Table.Th key="name">Nom</Table.Th>,
                    <Table.Th key="type">Type</Table.Th>,
                    <Table.Th key="status">Statut</Table.Th>,
                    <Table.Th key="scheme">Scheme</Table.Th>,
                    <Table.Th key="url">URL</Table.Th>,
                    <Table.Th key="infosImport">Infos import</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: TileSetDetail) => item.id,
                    (item: TileSetDetail) => <DateInfo date={item.date} hideTooltip={true} />,
                    (item: TileSetDetail) => item.name,
                    (item: TileSetDetail) => TILE_SET_TYPES_NAMES_MAP[item.tileSetType],
                    (item: TileSetDetail) => TILE_SET_STATUSES_NAMES_MAP[item.tileSetStatus],
                    (item: TileSetDetail) => item.tileSetScheme,
                    (item: TileSetDetail) => (
                        <Tooltip label={item.url}>
                            <Button
                                onClick={(e) => e.stopPropagation()}
                                leftSection={<IconLink size={16} />}
                                color="grey"
                                size="compact-xs"
                                variant="outline"
                                component={Link}
                                to={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                URL
                            </Button>
                        </Tooltip>
                    ),
                    (item: TileSetDetail) => {
                        if (!item.lastImportEndedAt && !item.lastImportStartedAt) {
                            return <IconX />;
                        }

                        if (item.lastImportStartedAt && !item.lastImportEndedAt) {
                            return <>En cours, débuté le {format(item.lastImportStartedAt, DEFAULT_DATETIME_FORMAT)}</>;
                        }

                        if (item.lastImportStartedAt && item.lastImportEndedAt) {
                            return (
                                <>Dernier import terminé le {format(item.lastImportEndedAt, DEFAULT_DATETIME_FORMAT)}</>
                            );
                        }
                    },
                ]}
                onItemClick={({ uuid }) => navigate(`/admin/tile-sets/form/${uuid}`)}
            />
        </LayoutAdminBase>
    );
};

export default Component;
