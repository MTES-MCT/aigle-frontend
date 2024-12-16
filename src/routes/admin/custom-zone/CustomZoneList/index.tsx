import React, { useState } from 'react';

import { GEO_CUSTOM_ZONE_LIST_ENDPOINT } from '@/api-endpoints';
import DataTable from '@/components/admin/DataTable';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import SoloAccordion from '@/components/admin/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { useAuth } from '@/utils/auth-context';
import { GEO_CUSTOM_ZONE_STATUSES_NAMES_MAP } from '@/utils/constants';
import { Button, ColorSwatch, Input, Table } from '@mantine/core';
import { IconHexagonPlus2, IconSearch } from '@tabler/icons-react';
import isEqual from 'lodash/isEqual';
import { Link, useNavigate } from 'react-router-dom';

interface DataFilter {
    q: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
};

const Component: React.FC = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<DataFilter>(DATA_FILTER_INITIAL_VALUE);
    const { userMe } = useAuth();

    return (
        <LayoutAdminBase
            title="Liste des zones à enjeux"
            actions={
                <>
                    <Button leftSection={<IconHexagonPlus2 />} component={Link} to="/admin/custom-zones/form">
                        Ajouter une zone
                    </Button>
                </>
            }
        >
            <DataTable<GeoCustomZone, DataFilter>
                endpoint={GEO_CUSTOM_ZONE_LIST_ENDPOINT}
                filter={filter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder="Rechercher une zone"
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
                    ...(userMe?.userRole === 'SUPER_ADMIN' ? [<Table.Th key="status">Statut</Table.Th>] : []),
                ]}
                tableBodyRenderFns={[
                    (item: GeoCustomZone) => <DateInfo date={item.createdAt} />,
                    (item: GeoCustomZone) => item.name,
                    (item: GeoCustomZone) => (
                        <div className="color-cell">
                            <ColorSwatch color={item.color} size={24} /> {item.color}
                        </div>
                    ),
                    ...(userMe?.userRole === 'SUPER_ADMIN'
                        ? [(item: GeoCustomZone) => GEO_CUSTOM_ZONE_STATUSES_NAMES_MAP[item.geoCustomZoneStatus]]
                        : []),
                ]}
                onItemClick={({ uuid }) => navigate(`/admin/custom-zones/form/${uuid}`)}
            />
        </LayoutAdminBase>
    );
};

export default Component;
