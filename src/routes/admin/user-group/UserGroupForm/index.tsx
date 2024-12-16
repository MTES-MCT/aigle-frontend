import React, { useState } from 'react';

import {
    GEO_CUSTOM_ZONE_LIST_ENDPOINT,
    OBJECT_TYPE_CATEGORY_LIST_ENDPOINT,
    USER_GROUP_POST_ENDPOINT,
    getUserDetailEndpoint,
    getUserGroupDetailEndpoint,
} from '@/api-endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import GeoCollectivitiesMultiSelects from '@/components/admin/form-fields/GeoCollectivitiesMultiSelects';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import SelectItem from '@/components/ui/SelectItem';
import WarningCard from '@/components/ui/WarningCard';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { ObjectType } from '@/models/object-type';
import { ObjectTypeCategory } from '@/models/object-type-category';
import { UserGroupDetail, UserGroupType, userGroupTypes } from '@/models/user-group';
import api from '@/utils/api';
import { USER_GROUP_TYPES_NAMES_MAP } from '@/utils/constants';
import { GeoValues, geoZoneToGeoOption } from '@/utils/geojson';
import { Button, MultiSelect, Select, TextInput } from '@mantine/core';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { IconUserPlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import classes from './index.module.scss';

const BACK_URL = '/admin/user-groups';

interface FormValues {
    name: string;
    userGroupType: UserGroupType;
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
    objectTypeCategoriesUuids: string[];
    geoCustomZonesUuids: string[];
}

const postForm = async (values: FormValues, uuid?: string) => {
    let response: AxiosResponse<ObjectType>;

    if (uuid) {
        response = await api.patch(getUserGroupDetailEndpoint(uuid), values);
    } else {
        response = await api.post(USER_GROUP_POST_ENDPOINT, values);
    }

    return response.data;
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
    initialGeoSelectedValues?: GeoValues;
    categories?: ObjectTypeCategory[];
    geoCustomZones?: GeoCustomZone[];
}

const Form: React.FC<FormProps> = ({ uuid, initialValues, initialGeoSelectedValues, categories, geoCustomZones }) => {
    const [error, setError] = useState<AxiosError>();
    const navigate = useNavigate();

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues,
        validate: {
            name: isNotEmpty('Le nom du groupe est requis'),
        },
    });

    const mutation: UseMutationResult<ObjectType, AxiosError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, uuid),
        onSuccess: () => {
            navigate(BACK_URL);
        },
        onError: (error) => {
            setError(error);
            if (error.response?.data) {
                // @ts-expect-error types do not match
                form.setErrors(error.response?.data);
            }
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    const label = uuid ? 'Modifier un groupe utilisateurs' : 'Ajouter un groupe utilisateurs';

    // geo data

    const { communesUuids, departmentsUuids, regionsUuids, objectTypeCategoriesUuids } = form.getValues();
    const collectivitiesUuids = [...communesUuids, ...departmentsUuids, ...regionsUuids];

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <h1>{label}</h1>

            {uuid && (!collectivitiesUuids.length || !objectTypeCategoriesUuids.length) ? (
                <WarningCard title="Accès aux données" className={classes['warning-card']}>
                    <p>Ce groupe n&apos;a pas de collectivités ou de thématiques associées.</p>
                    <p>Les utilisateurs du groupe ne pourront accéder à aucune donnée.</p>
                </WarningCard>
            ) : null}

            {error ? (
                <ErrorCard>
                    <p>Voir les indications ci-dessous pour plus d&apos;info</p>
                </ErrorCard>
            ) : null}
            <TextInput
                mt="md"
                withAsterisk
                label="Nom du groupe"
                placeholder="Mon groupe"
                key={form.key('name')}
                {...form.getInputProps('name')}
            />
            <Select
                allowDeselect={false}
                label="Type"
                withAsterisk
                mt="md"
                data={userGroupTypes.map((type) => ({
                    value: type,
                    label: USER_GROUP_TYPES_NAMES_MAP[type],
                }))}
                key={form.key('userGroupType')}
                {...form.getInputProps('userGroupType')}
            />

            <MultiSelect
                mt="md"
                label="Thématiques"
                placeholder="Déchets, constructions,..."
                searchable
                data={(categories || []).map(({ name, uuid }) => ({
                    value: uuid,
                    label: name,
                }))}
                renderOption={(item) => <SelectItem item={item} />}
                key={form.key('objectTypeCategoriesUuids')}
                {...form.getInputProps('objectTypeCategoriesUuids')}
            />
            <MultiSelect
                mt="md"
                label="Zones"
                placeholder="Zones à risque fort,..."
                searchable
                data={(geoCustomZones || []).map(({ name, uuid }) => ({
                    value: uuid,
                    label: name,
                }))}
                renderOption={(item) => <SelectItem item={item} />}
                key={form.key('geoCustomZonesUuids')}
                {...form.getInputProps('geoCustomZonesUuids')}
            />
            <h2 className="form-sub-title">Collectivités accessibles par le groupe</h2>

            <GeoCollectivitiesMultiSelects form={form} initialGeoSelectedValues={initialGeoSelectedValues} />

            <div className="form-actions">
                <Button
                    disabled={mutation.status === 'pending'}
                    type="button"
                    variant="outline"
                    component={Link}
                    to={BACK_URL}
                >
                    Annuler
                </Button>

                <Button disabled={mutation.status === 'pending'} type="submit" leftSection={<IconUserPlus />}>
                    {label}
                </Button>
            </div>
        </form>
    );
};

const EMPTY_FORM_VALUES: FormValues = {
    name: '',
    userGroupType: 'COLLECTIVITY',
    communesUuids: [],
    departmentsUuids: [],
    regionsUuids: [],
    objectTypeCategoriesUuids: [],
    geoCustomZonesUuids: [],
};

const ComponentInner: React.FC = () => {
    // user group

    const { uuid } = useParams();

    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const res = await api.get<UserGroupDetail>(getUserGroupDetailEndpoint(uuid));
        const initialValues = {
            ...res.data,
            communesUuids: res.data.communes.map((commune) => commune.uuid),
            departmentsUuids: res.data.departments.map((department) => department.uuid),
            regionsUuids: res.data.regions.map((region) => region.uuid),
            objectTypeCategoriesUuids: res.data.objectTypeCategories.map(
                (objectTypeCategory) => objectTypeCategory.uuid,
            ),
            geoCustomZonesUuids: res.data.geoCustomZones.map((geoCustomZone) => geoCustomZone.uuid),
        };
        const initialGeoSelectedValues: GeoValues = {
            region: res.data.regions.map((region) => geoZoneToGeoOption(region)),
            department: res.data.departments.map((department) => geoZoneToGeoOption(department)),
            commune: res.data.communes.map((commune) => geoZoneToGeoOption(commune)),
        };

        return { initialValues, initialGeoSelectedValues };
    };

    const { isLoading, error, data } = useQuery({
        queryKey: [getUserDetailEndpoint(String(uuid))],
        enabled: !!uuid,
        queryFn: () => fetchData(),
    });

    // additional data

    const fetchObjectTypeCategories = async () => {
        const res = await api.get<ObjectTypeCategory[]>(OBJECT_TYPE_CATEGORY_LIST_ENDPOINT);
        return res.data;
    };

    const { data: categories } = useQuery({
        queryKey: [OBJECT_TYPE_CATEGORY_LIST_ENDPOINT],
        queryFn: () => fetchObjectTypeCategories(),
    });

    const fetchGeoCustomZones = async () => {
        const res = await api.get<GeoCustomZone[]>(GEO_CUSTOM_ZONE_LIST_ENDPOINT);
        return res.data;
    };

    const { data: geoCustomZones } = useQuery({
        queryKey: [GEO_CUSTOM_ZONE_LIST_ENDPOINT],
        queryFn: () => fetchGeoCustomZones(),
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return (
        <Form
            uuid={uuid}
            initialValues={data?.initialValues || EMPTY_FORM_VALUES}
            initialGeoSelectedValues={data?.initialGeoSelectedValues}
            geoCustomZones={geoCustomZones}
            categories={categories}
        />
    );
};

const Component: React.FC = () => {
    return (
        <LayoutAdminForm backText="Liste des groupes" backUrl={BACK_URL}>
            <ComponentInner />
        </LayoutAdminForm>
    );
};

export default Component;
