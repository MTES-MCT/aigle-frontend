import React, { useMemo } from 'react';

import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { CollectivityType, GeoCollectivity, collectivityTypes } from '@/models/geo/_common';
import { COLLECTIVITY_TYPES_ENDPOINTS_MAP, COLLECTIVITY_TYPES_NAMES_MAP } from '@/utils/constants';
import { Button, Input, Table } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

interface DataFilter {
    q: string;
    collectivityType: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    collectivityType: collectivityTypes[0],
};

const Component: React.FC = () => {
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);
    const navigate = useNavigate();

    const collectivityTypeSelected = (
        collectivityTypes.includes(filter.collectivityType as CollectivityType)
            ? filter.collectivityType
            : collectivityTypes[0]
    ) as CollectivityType;

    const endpoint = useMemo(
        () => COLLECTIVITY_TYPES_ENDPOINTS_MAP[collectivityTypeSelected],
        [collectivityTypeSelected],
    );

    const apiFilter = useMemo(() => ({ q: filter.q }), [filter.q]);

    return (
        <LayoutAdminBase title={`Liste des collectivités`}>
            <Button.Group className="admin-tabs">
                {collectivityTypes.map((type) => (
                    <Button
                        key={type}
                        variant={collectivityTypeSelected === type ? 'filled' : 'outline'}
                        onClick={() => setFilter((prev) => ({ ...prev, collectivityType: type }))}
                        className="admin-tab"
                    >
                        {COLLECTIVITY_TYPES_NAMES_MAP[type]}
                    </Button>
                ))}
            </Button.Group>
            <DataTable<GeoCollectivity, { q: string }>
                endpoint={endpoint}
                filter={apiFilter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={filter.q !== ''}>
                        <Input
                            placeholder={`Rechercher ${COLLECTIVITY_TYPES_NAMES_MAP[collectivityTypeSelected]}`}
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
                onItemClick={({ uuid }) =>
                    navigate(`/admin/collectivites/${collectivityTypeSelected}/form/${uuid}${window.location.search}`)
                }
            />
        </LayoutAdminBase>
    );
};

export default Component;
