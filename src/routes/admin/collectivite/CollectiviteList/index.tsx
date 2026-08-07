import React, { useMemo } from 'react';

import AdminTabs, { AdminTab } from '@/components/admin/AdminTabs';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import { useFilterNavigation } from '@/hooks/useFilterNavigation';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { CollectivityType, GeoCollectivity, collectivityTypes } from '@/models/geo/_common';
import { COLLECTIVITY_TYPES_ENDPOINTS_MAP, COLLECTIVITY_TYPES_NAMES_MAP } from '@/utils/constants';
import { Input, Table } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

interface DataFilter {
    q: string;
    // the collectivity type IS the tab — same `tab` param as the other admin lists
    tab: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    tab: collectivityTypes[0],
};

const Component: React.FC = () => {
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);
    const { navigate } = useFilterNavigation();

    const collectivityTypeSelected = (
        collectivityTypes.includes(filter.tab as CollectivityType) ? filter.tab : collectivityTypes[0]
    ) as CollectivityType;

    // DataTable resets its pagination whenever `filter` changes identity — keep it stable
    const apiFilter = useMemo(() => ({ q: filter.q }), [filter.q]);

    // one tab per collectivity type: the same table on another endpoint
    const tabs: AdminTab[] = collectivityTypes.map((type) => ({
        value: type,
        label: COLLECTIVITY_TYPES_NAMES_MAP[type],
        content: (
            <DataTable<GeoCollectivity, { q: string }>
                endpoint={COLLECTIVITY_TYPES_ENDPOINTS_MAP[type]}
                showCopyUuidCol
                filter={apiFilter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={filter.q !== ''}>
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
                    </SoloAccordion>
                }
                tableHeader={[<Table.Th key="code">Code</Table.Th>, <Table.Th key="name">Nom</Table.Th>]}
                tableBodyRenderFns={[(item: GeoCollectivity) => item.code, (item: GeoCollectivity) => item.name]}
                onItemClick={({ uuid }) => navigate(`/admin/collectivites/${type}/form/${uuid}`)}
            />
        ),
    }));

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
