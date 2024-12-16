import React, { useState } from 'react';

import { OBJECT_TYPE_CATEGORY_LIST_ENDPOINT, OBJECT_TYPE_LIST_ENDPOINT } from '@/api-endpoints';
import DataTable from '@/components/admin/DataTable';
import SoloAccordion from '@/components/admin/SoloAccordion';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import PillsDataCell from '@/components/admin/data-cells/PillsDataCell';
import DateInfo from '@/components/ui/DateInfo';
import SelectItem from '@/components/ui/SelectItem';
import { ObjectType, ObjectTypeDetail } from '@/models/object-type';
import { ObjectTypeCategory } from '@/models/object-type-category';
import api from '@/utils/api';
import { Button, ColorSwatch, Input, MultiSelect, Table } from '@mantine/core';
import { IconCubePlus, IconSearch, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import isEqual from 'lodash/isEqual';
import { Link, useNavigate } from 'react-router-dom';

interface DataFilter {
    q: string;
    objectTypeCategoriesUuids: string[];
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    objectTypeCategoriesUuids: [],
};

const Component: React.FC = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<DataFilter>(DATA_FILTER_INITIAL_VALUE);

    const fetchObjectTypeCategories = async () => {
        const res = await api.get<ObjectType[]>(OBJECT_TYPE_CATEGORY_LIST_ENDPOINT);
        return res.data;
    };

    const { data: objectTypeCategories } = useQuery({
        queryKey: [OBJECT_TYPE_CATEGORY_LIST_ENDPOINT],
        queryFn: () => fetchObjectTypeCategories(),
    });

    return (
        <LayoutAdminBase
            title="Liste des types d'objets"
            actions={
                <>
                    <Button leftSection={<IconCubePlus />} component={Link} to="/admin/object-types/form">
                        Ajouter un type d&apos;objet
                    </Button>
                </>
            }
        >
            <DataTable<ObjectTypeDetail, DataFilter>
                endpoint={OBJECT_TYPE_LIST_ENDPOINT}
                filter={filter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder="Rechercher type d'objet"
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
                        <MultiSelect
                            mt="md"
                            label="Thématiques"
                            placeholder="Déchets, constructions,..."
                            searchable
                            data={(objectTypeCategories || []).map(({ name, uuid }) => ({
                                value: uuid,
                                label: name,
                            }))}
                            renderOption={(item) => <SelectItem item={item} />}
                            value={filter.objectTypeCategoriesUuids}
                            onChange={(objectTypeCategoriesUuids: string[]) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    objectTypeCategoriesUuids,
                                }))
                            }
                        />
                    </SoloAccordion>
                }
                tableHeader={[
                    <Table.Th key="createdAt">Date création</Table.Th>,
                    <Table.Th key="color">Couleur</Table.Th>,
                    <Table.Th key="name">Nom</Table.Th>,
                    <Table.Th key="prescription">Prescription</Table.Th>,
                    <Table.Th key="categories">Thématiques</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: ObjectTypeDetail) => <DateInfo date={item.createdAt} />,
                    (item: ObjectTypeDetail) => (
                        <div className="color-cell">
                            <ColorSwatch color={item.color} size={24} /> {item.color}
                        </div>
                    ),
                    (item: ObjectTypeDetail) => item.name,
                    (item: ObjectTypeDetail) => (
                        <>{item.prescriptionDurationYears ? `${item.prescriptionDurationYears} ans` : <IconX />}</>
                    ),
                    (item: ObjectTypeDetail) => (
                        <PillsDataCell<ObjectTypeCategory>
                            items={item.categories}
                            toLink={(cat) => `/admin/object-type-categories/form/${cat.uuid}`}
                            getLabel={(cat) => cat.name}
                        />
                    ),
                ]}
                onItemClick={({ uuid }) => navigate(`/admin/object-types/form/${uuid}`)}
            />
        </LayoutAdminBase>
    );
};

export default Component;
