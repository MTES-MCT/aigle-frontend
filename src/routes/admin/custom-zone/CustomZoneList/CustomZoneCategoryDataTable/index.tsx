import { GEO_CUSTOM_ZONE_CATEGORY_LIST_ENDPOINT } from '@/api-endpoints';
import DataTable from '@/components/admin/DataTable';
import SoloAccordion from '@/components/admin/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import { GeoCustomZoneCategory } from '@/models/geo/geo-custom-zone-category';
import { ColorSwatch, Input, Table } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { isEqual } from 'lodash';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface DataFilter {
    q: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
};

const Component: React.FC = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<DataFilter>(DATA_FILTER_INITIAL_VALUE);

    return (
        <DataTable<GeoCustomZoneCategory, DataFilter>
            endpoint={GEO_CUSTOM_ZONE_CATEGORY_LIST_ENDPOINT}
            filter={filter}
            SoloAccordion={
                <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                    <Input
                        placeholder="Rechercher une catégorie"
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
            tableHeader={[
                <Table.Th key="createdAt">Date création</Table.Th>,
                <Table.Th key="name">Nom</Table.Th>,
                <Table.Th key="color">Couleur</Table.Th>,
            ]}
            tableBodyRenderFns={[
                (item: GeoCustomZoneCategory) => <DateInfo date={item.createdAt} />,
                (item: GeoCustomZoneCategory) => item.name,
                (item: GeoCustomZoneCategory) => (
                    <div className="color-cell">
                        <ColorSwatch color={item.color} size={24} /> {item.color}
                    </div>
                ),
            ]}
            onItemClick={({ uuid }) => navigate(`/admin/custom-zones/category-form/${uuid}`)}
        />
    );
};

export default Component;
