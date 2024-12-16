import React, { useState } from 'react';

import { USER_GROUP_LIST_ENDPOINT } from '@/api-endpoints';
import DataTable from '@/components/admin/DataTable';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import SoloAccordion from '@/components/admin/SoloAccordion';
import PillsDataCell from '@/components/admin/data-cells/PillsDataCell';
import DateInfo from '@/components/ui/DateInfo';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { GeoZone } from '@/models/geo/geo-zone';
import { ObjectTypeCategory } from '@/models/object-type-category';
import { UserGroupDetail } from '@/models/user-group';
import { USER_GROUP_TYPES_NAMES_MAP } from '@/utils/constants';
import { Button, Input, Table } from '@mantine/core';
import { IconSearch, IconUserPlus } from '@tabler/icons-react';
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

    return (
        <LayoutAdminBase
            title="Liste des groupes d'utilisateurs"
            actions={
                <>
                    <Button leftSection={<IconUserPlus />} component={Link} to={'/admin/user-groups/form'}>
                        Ajouter un groupe
                    </Button>
                </>
            }
        >
            <DataTable<UserGroupDetail, DataFilter>
                endpoint={USER_GROUP_LIST_ENDPOINT}
                filter={filter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder="Rechercher un groupe"
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
                    <Table.Th key="userGroupType">Type</Table.Th>,
                    <Table.Th key="categories">Thématiques</Table.Th>,
                    <Table.Th key="collectivities">Collectivités</Table.Th>,
                    <Table.Th key="geoCustomZones">Zones</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: UserGroupDetail) => <DateInfo date={item.createdAt} />,
                    (item: UserGroupDetail) => item.name,
                    (item: UserGroupDetail) => USER_GROUP_TYPES_NAMES_MAP[item.userGroupType],
                    (item: UserGroupDetail) => (
                        <PillsDataCell<ObjectTypeCategory>
                            items={item.objectTypeCategories}
                            toLink={(cat) => `/admin/object-type-categories/form/${cat.uuid}`}
                            getLabel={(cat) => cat.name}
                        />
                    ),
                    (item: UserGroupDetail) => (
                        <PillsDataCell<GeoZone>
                            items={[...item.regions, ...item.departments, ...item.communes]}
                            getLabel={(geo) => geo.name}
                        />
                    ),
                    (item: UserGroupDetail) => (
                        <PillsDataCell<GeoCustomZone> items={item.geoCustomZones} getLabel={(geo) => geo.name} />
                    ),
                ]}
                onItemClick={({ uuid }) => navigate(`/admin/user-groups/form/${uuid}`)}
            />
        </LayoutAdminBase>
    );
};

export default Component;
