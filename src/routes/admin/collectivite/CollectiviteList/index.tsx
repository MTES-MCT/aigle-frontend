import React, { useMemo } from 'react';

import AdminTabs, { AdminTab } from '@/components/admin/AdminTabs';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import { useFilterNavigation } from '@/hooks/useFilterNavigation';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { CollectivityType, GeoCollectivity, collectivityTypes } from '@/models/geo/_common';
import GeoParentFilter from '@/routes/admin/collectivite/CollectiviteList/GeoParentFilter';
import { COLLECTIVITY_TYPES_ENDPOINTS_MAP, COLLECTIVITY_TYPES_NAMES_MAP } from '@/utils/constants';
import { ActionIcon, Group, Input, Table, Tooltip } from '@mantine/core';
import { IconBuildingCommunity, IconBuildingEstate, IconMap2, IconSearch } from '@tabler/icons-react';

// A collectivity type usable as a parent filter — every level but the deepest one.
type ParentType = Exclude<CollectivityType, 'commune'>;

const PARENT_FILTER_CONFIG = {
    region: { key: 'regionsUuids', label: 'Régions', placeholder: 'Filtrer par région' },
    department: { key: 'departmentsUuids', label: 'Départements', placeholder: 'Filtrer par département' },
    epci: { key: 'epcisUuids', label: 'EPCI', placeholder: 'Filtrer par EPCI' },
} as const satisfies Record<ParentType, { key: keyof DataFilter; label: string; placeholder: string }>;

// Which ancestor levels each tab can be filtered by.
const PARENT_TYPES: Record<CollectivityType, ParentType[]> = {
    region: [],
    department: ['region'],
    epci: ['region', 'department'],
    commune: ['region', 'department', 'epci'],
};

// Row shortcut: jump to the child tab, pre-filtered on the clicked row.
const DRILL_DOWNS: Record<
    CollectivityType,
    { target: CollectivityType; parent: ParentType; Icon: typeof IconMap2; tooltip: string }[]
> = {
    region: [
        {
            target: 'department',
            parent: 'region',
            Icon: IconMap2,
            tooltip: 'Voir les départements de cette région',
        },
    ],
    department: [
        {
            target: 'epci',
            parent: 'department',
            Icon: IconBuildingCommunity,
            tooltip: 'Voir les EPCI de ce département',
        },
        {
            target: 'commune',
            parent: 'department',
            Icon: IconBuildingEstate,
            tooltip: 'Voir les communes de ce département',
        },
    ],
    epci: [
        {
            target: 'commune',
            parent: 'epci',
            Icon: IconBuildingEstate,
            tooltip: 'Voir les communes de cet EPCI',
        },
    ],
    commune: [],
};

interface DataFilter {
    q: string;
    // the collectivity type IS the tab — same `tab` param as the other admin lists
    tab: string;
    regionsUuids: string[];
    departmentsUuids: string[];
    epcisUuids: string[];
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    tab: collectivityTypes[0],
    regionsUuids: [],
    departmentsUuids: [],
    epcisUuids: [],
};

const Component: React.FC = () => {
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);
    const { navigate } = useFilterNavigation();

    const collectivityTypeSelected = (
        collectivityTypes.includes(filter.tab as CollectivityType) ? filter.tab : collectivityTypes[0]
    ) as CollectivityType;

    const parentTypes = PARENT_TYPES[collectivityTypeSelected];

    // DataTable resets its pagination whenever `filter` changes identity — keep it stable.
    // Built for the selected tab only: the others are unmounted (AdminTabs keepMounted=false).
    const apiFilter = useMemo(() => {
        const params: Record<string, string | string[]> = { q: filter.q };
        parentTypes.forEach((parent) => {
            const { key } = PARENT_FILTER_CONFIG[parent];
            params[key] = filter[key];
        });
        return params;
    }, [filter, parentTypes]);

    const filterActive =
        filter.q !== '' || parentTypes.some((parent) => filter[PARENT_FILTER_CONFIG[parent].key].length);

    const drillDown = (target: CollectivityType, parent: ParentType, uuid: string) =>
        setFilter({
            ...DATA_FILTER_INITIAL_VALUE,
            tab: target,
            [PARENT_FILTER_CONFIG[parent].key]: [uuid],
        });

    // one tab per collectivity type: the same table on another endpoint
    const tabs: AdminTab[] = collectivityTypes.map((type) => {
        const drillDowns = DRILL_DOWNS[type];

        return {
            value: type,
            label: COLLECTIVITY_TYPES_NAMES_MAP[type],
            content: (
                <DataTable<GeoCollectivity, typeof apiFilter>
                    endpoint={COLLECTIVITY_TYPES_ENDPOINTS_MAP[type]}
                    showCopyUuidCol
                    filter={apiFilter}
                    SoloAccordion={
                        <SoloAccordion indicatorShown={filterActive}>
                            <Input
                                placeholder={`Rechercher ${COLLECTIVITY_TYPES_NAMES_MAP[type]}`}
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

                            {PARENT_TYPES[type].map((parent) => {
                                const { key, label, placeholder } = PARENT_FILTER_CONFIG[parent];

                                return (
                                    <GeoParentFilter
                                        key={parent}
                                        collectivityType={parent}
                                        label={label}
                                        placeholder={placeholder}
                                        value={filter[key]}
                                        onChange={(uuids) => setFilter((filter) => ({ ...filter, [key]: uuids }))}
                                    />
                                );
                            })}
                        </SoloAccordion>
                    }
                    tableHeader={[
                        <Table.Th key="code">Code</Table.Th>,
                        <Table.Th key="name">Nom</Table.Th>,
                        ...(drillDowns.length
                            ? [
                                  <Table.Th key="drill-downs" w={44 * drillDowns.length + 16}>
                                      Voir
                                  </Table.Th>,
                              ]
                            : []),
                    ]}
                    tableBodyRenderFns={[
                        (item: GeoCollectivity) => item.code,
                        (item: GeoCollectivity) => item.name,
                        ...(drillDowns.length
                            ? [
                                  (item: GeoCollectivity) => (
                                      <Group gap="xs" wrap="nowrap">
                                          {drillDowns.map(({ target, parent, Icon, tooltip }) => (
                                              <Tooltip key={target} label={tooltip} withArrow>
                                                  <ActionIcon
                                                      variant="subtle"
                                                      color="gray"
                                                      aria-label={tooltip}
                                                      onClick={(event) => {
                                                          // the cell itself opens the edit form
                                                          event.stopPropagation();
                                                          drillDown(target, parent, item.uuid);
                                                      }}
                                                  >
                                                      <Icon size={16} />
                                                  </ActionIcon>
                                              </Tooltip>
                                          ))}
                                      </Group>
                                  ),
                              ]
                            : []),
                    ]}
                    onItemClick={({ uuid }) => navigate(`/admin/collectivites/${type}/form/${uuid}`)}
                />
            ),
        };
    });

    return (
        <LayoutAdminBase title="Liste des collectivités">
            <AdminTabs
                tabs={tabs}
                value={collectivityTypeSelected}
                onChange={(tab) => setFilter((filter) => ({ ...filter, tab }))}
            />
        </LayoutAdminBase>
    );
};

export default Component;
