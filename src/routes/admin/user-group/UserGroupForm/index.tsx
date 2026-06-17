import React, { useState } from 'react';

import { customZoneEndpoints, objectTypeCategoryEndpoints, userGroupEndpoints, usersEndpoints } from '@/api/endpoints';
import GeoCollectivitiesMultiSelects from '@/components/FormFields/GeoCollectivitiesMultiSelects';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import InfoCard from '@/components/ui/InfoCard';
import Loader from '@/components/ui/Loader';
import SelectItem from '@/components/ui/SelectItem';
import { useFilterNavigation } from '@/hooks/useFilterNavigation';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { ObjectType } from '@/models/object-type';
import { ObjectTypeCategory } from '@/models/object-type-category';
import { UserGroupDetail, UserGroupType, userGroupTypes } from '@/models/user-group';
import api, { ApiError } from '@/utils/api';
import { USER_GROUP_TYPES_NAMES_MAP } from '@/utils/constants';
import { GeoValues, geoZoneToGeoOption } from '@/utils/geojson';
import { Button, MultiSelect, Select, TextInput } from '@mantine/core';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { IconUserPlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

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

const postForm = (values: FormValues, uuid?: string) => {
    if (uuid) {
        return api<ObjectType>(userGroupEndpoints.detail(uuid), { method: 'PATCH', body: values });
    }
    return api<ObjectType>(userGroupEndpoints.create, { method: 'POST', body: values });
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
    initialGeoSelectedValues?: GeoValues;
    categories?: ObjectTypeCategory[];
    geoCustomZones?: GeoCustomZone[];
}

const Form: React.FC<FormProps> = ({ uuid, initialValues, initialGeoSelectedValues, categories, geoCustomZones }) => {
    const [error, setError] = useState<ApiError>();
    const { navigate, buildPath } = useFilterNavigation();

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues,
        validate: {
            name: isNotEmpty('Le nom du groupe est requis'),
        },
    });

    const mutation: UseMutationResult<ObjectType, ApiError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, uuid),
        onSuccess: () => {
            navigate(BACK_URL);
        },
        onError: (error) => {
            setError(error);
            if (error.body && typeof error.body === 'object') {
                form.setErrors(error.body as Record<string, string>);
            }
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    const label = uuid ? 'Modifier un groupe utilisateurs' : 'Ajouter un groupe utilisateurs';

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <h1>{label}</h1>

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

            <InfoCard title="Droits d'accès">
                <p>
                    Les droits d&apos;accès sont cumulatifs : ajouter un département donne accès à l&apos;ensemble de
                    ses communes.
                </p>
                <p>
                    Si le groupe ne doit accéder qu&apos;à certaines communes, sélectionnez uniquement ces communes sans
                    ajouter leur département ni leur région.
                </p>
            </InfoCard>

            <GeoCollectivitiesMultiSelects form={form} initialGeoSelectedValues={initialGeoSelectedValues} />

            <div className="form-actions">
                <Button
                    disabled={mutation.status === 'pending'}
                    type="button"
                    variant="outline"
                    component={Link}
                    to={buildPath(BACK_URL)}
                >
                    Annuler
                </Button>

                <Button
                    disabled={mutation.status === 'pending'}
                    loading={mutation.status === 'pending'}
                    type="submit"
                    leftSection={<IconUserPlus />}
                >
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
    const { uuid } = useParams();

    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const userGroup = await api<UserGroupDetail>(userGroupEndpoints.detail(uuid));
        const initialValues = {
            ...userGroup,
            communesUuids: userGroup.communes.map((commune) => commune.uuid),
            departmentsUuids: userGroup.departments.map((department) => department.uuid),
            regionsUuids: userGroup.regions.map((region) => region.uuid),
            objectTypeCategoriesUuids: userGroup.objectTypeCategories.map(
                (objectTypeCategory) => objectTypeCategory.uuid,
            ),
            geoCustomZonesUuids: userGroup.geoCustomZones.map((geoCustomZone) => geoCustomZone.uuid),
        };
        const initialGeoSelectedValues: GeoValues = {
            region: userGroup.regions.map((region) => geoZoneToGeoOption(region)),
            department: userGroup.departments.map((department) => geoZoneToGeoOption(department)),
            commune: userGroup.communes.map((commune) => geoZoneToGeoOption(commune)),
        };

        return { initialValues, initialGeoSelectedValues };
    };

    const { isLoading, error, data } = useQuery({
        queryKey: [usersEndpoints.detail(String(uuid))],
        enabled: !!uuid,
        queryFn: () => fetchData(),
    });

    const fetchObjectTypeCategories = () => api<ObjectTypeCategory[]>(objectTypeCategoryEndpoints.list);

    const { data: categories } = useQuery({
        queryKey: [objectTypeCategoryEndpoints.list],
        queryFn: () => fetchObjectTypeCategories(),
    });

    const fetchGeoCustomZones = () => api<GeoCustomZone[]>(customZoneEndpoints.list);

    const { data: geoCustomZones } = useQuery({
        queryKey: [customZoneEndpoints.list],
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
        <LayoutAdminForm title="Formulaire groupe utilisateur" backText="Liste des groupes" backUrl={BACK_URL}>
            <ComponentInner />
        </LayoutAdminForm>
    );
};

export default Component;
