import React, { useState } from 'react';

import { objectTypeCategoryEndpoints, objectTypeEndpoints } from '@/api/endpoints';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import PillsDataCell from '@/components/DataCells/PillsDataCell';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import DateInfo from '@/components/ui/DateInfo';
import SelectItem from '@/components/ui/SelectItem';
import { Uuided } from '@/models/data';
import { ObjectType } from '@/models/object-type';
import {
    ObjectTypeCategoryDetail,
    ObjectTypeCategoryObjectType,
    ObjectTypeCategoryObjectTypeStatus,
} from '@/models/object-type-category';
import api from '@/utils/api';
import { Button, Input, MultiSelect, Table } from '@mantine/core';
import { IconCategoryPlus, IconEye, IconEyeDotted, IconEyeOff, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import isEqual from 'lodash/isEqual';
import { Link, useNavigate } from 'react-router-dom';

interface DataFilter {
    q: string;
    objectTypesUuids: string[];
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
    objectTypesUuids: [],
};

interface ObjectTypeCategoryObjectTypePill extends Uuided {
    objectTypeCategoryObjectType: ObjectTypeCategoryObjectType;
}

const OBJECT_TYPE_CATEGORY_ICON_SIZE = 14;

interface ObjectTypeCategoryIconProps {
    objectTypeCategoryObjectTypeStatus: ObjectTypeCategoryObjectTypeStatus;
}

const ObjectTypeCategoryIcon: React.FC<ObjectTypeCategoryIconProps> = ({ objectTypeCategoryObjectTypeStatus }) => {
    if (objectTypeCategoryObjectTypeStatus === 'VISIBLE') {
        return <IconEye size={OBJECT_TYPE_CATEGORY_ICON_SIZE} />;
    }

    if (objectTypeCategoryObjectTypeStatus === 'OTHER_CATEGORY') {
        return <IconEyeDotted size={OBJECT_TYPE_CATEGORY_ICON_SIZE} />;
    }

    return <IconEyeOff size={14} />;
};

const Component: React.FC = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<DataFilter>(DATA_FILTER_INITIAL_VALUE);

    const fetchObjectTypes = async () => {
        const res = await api.get<ObjectType[]>(objectTypeEndpoints.list);
        return res.data;
    };

    const { data: objectTypes } = useQuery({
        queryKey: [objectTypeEndpoints.list],
        queryFn: () => fetchObjectTypes(),
    });
    const objectTypesUuidsColorsMap: Record<string, string> =
        objectTypes?.reduce(
            (prev, curr) => ({
                ...prev,
                [curr.uuid]: curr.color,
            }),
            {},
        ) || {};

    return (
        <LayoutAdminBase
            title="Liste des thématiques"
            actions={
                <>
                    <Button leftSection={<IconCategoryPlus />} component={Link} to="/admin/object-type-categories/form">
                        Ajouter une thématique
                    </Button>
                </>
            }
        >
            <DataTable<ObjectTypeCategoryDetail, DataFilter>
                endpoint={objectTypeCategoryEndpoints.list}
                filter={filter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder="Rechercher une thématique"
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
                            label="Types d'objets"
                            placeholder="Caravane, piscine,..."
                            searchable
                            data={(objectTypes || []).map(({ name, uuid }) => ({
                                value: uuid,
                                label: name,
                            }))}
                            renderOption={(item) => (
                                <SelectItem item={item} color={objectTypesUuidsColorsMap[item.option.value]} />
                            )}
                            value={filter.objectTypesUuids}
                            onChange={(objectTypesUuids: string[]) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    objectTypesUuids,
                                }))
                            }
                        />
                    </SoloAccordion>
                }
                tableHeader={[
                    <Table.Th key="createdAt">Date création</Table.Th>,
                    <Table.Th key="name">Nom</Table.Th>,
                    <Table.Th key="objectTypes">Types d&apos;objets</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: ObjectTypeCategoryDetail) => <DateInfo date={item.createdAt} />,
                    (item: ObjectTypeCategoryDetail) => item.name,
                    (item: ObjectTypeCategoryDetail) => (
                        <PillsDataCell<ObjectTypeCategoryObjectTypePill>
                            items={item.objectTypeCategoryObjectTypes.map((objectTypeCategoryObjectType) => ({
                                uuid: objectTypeCategoryObjectType.objectType.uuid,
                                objectTypeCategoryObjectType,
                            }))}
                            getLabel={(item) => item.objectTypeCategoryObjectType.objectType.name}
                            toLink={(item) =>
                                `/admin/object-types/form/${item.objectTypeCategoryObjectType.objectType.uuid}`
                            }
                            getLeftSection={(item) => (
                                <ObjectTypeCategoryIcon
                                    objectTypeCategoryObjectTypeStatus={
                                        item.objectTypeCategoryObjectType.objectTypeCategoryObjectTypeStatus
                                    }
                                />
                            )}
                        />
                    ),
                ]}
                onItemClick={({ uuid }) => navigate(`/admin/object-type-categories/form/${uuid}`)}
            />
        </LayoutAdminBase>
    );
};

export default Component;
