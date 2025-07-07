import React, { useState } from 'react';

import { customZoneEndpoints } from '@/api/endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import api from '@/utils/api';
import { Button, ColorInput, Select, TextInput } from '@mantine/core';
import { isNotEmpty, useForm, UseFormReturnType } from '@mantine/form';
import { IconHexagonPlus2 } from '@tabler/icons-react';
import { useMutation, UseMutationResult, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';

import GeoCollectivitiesMultiSelects from '@/components/FormFields/GeoCollectivitiesMultiSelects';
import InfoCard from '@/components/ui/InfoCard';
import {
    GeoCustomZoneDetail,
    GeoCustomZoneStatus,
    geoCustomZoneStatuses,
    GeoCustomZoneType,
    geoCustomZoneTypes,
    GeoCustomZoneWithCollectivities,
} from '@/models/geo/geo-custom-zone';
import { GeoCustomZoneCategory } from '@/models/geo/geo-custom-zone-category';
import { UserRole } from '@/models/user';
import { useAuth } from '@/utils/auth-context';
import { GEO_CUSTOM_ZONE_STATUSES_NAMES_MAP, GEO_CUSTOM_ZONE_TYPES_NAMES_MAP } from '@/utils/constants';
import { GeoValues, geoZoneToGeoOption } from '@/utils/geojson';

const BACK_URL = '/admin/custom-zones';

interface FormValues {
    name: string;
    nameShort: string;
    color: string;
    geoCustomZoneStatus: GeoCustomZoneStatus;
    geoCustomZoneType: GeoCustomZoneType;
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
    geoCustomZoneCategoryUuid?: string;
}

const postForm = async (values: FormValues, uuid?: string) => {
    const values_ = {
        ...values,
        color: values.color || null,
    };

    if (!uuid) {
        const response = await api.post(customZoneEndpoints.create, values_);
        return response.data;
    } else {
        const response = await api.patch(customZoneEndpoints.detail(uuid), values_);
        return response.data;
    }
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
    initialGeoSelectedValues?: GeoValues;
    geoCustomZoneCategories: GeoCustomZoneCategory[];
}

const Form: React.FC<FormProps> = ({ uuid, initialValues, initialGeoSelectedValues, geoCustomZoneCategories }) => {
    const [error, setError] = useState<AxiosError>();
    const navigate = useNavigate();
    const { userMe } = useAuth();

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues,
        validate: {
            color: (value: string, formValues: FormValues) => {
                if (formValues.geoCustomZoneCategoryUuid) {
                    return undefined;
                }

                return isNotEmpty("La couleur est requise si aucune catégorie n'est sélectionnée")(value);
            },
        },
    });

    const mutation: UseMutationResult<GeoCustomZoneDetail, AxiosError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, uuid),
        onSuccess: () => {
            navigate(BACK_URL);
        },
        onError: (error) => {
            setError(error);
            if (error.response?.data) {
                // Fixed TypeScript error
                if (error.response?.data && typeof error.response.data === 'object') {
                    form.setErrors(error.response.data as Record<string, string>);
                }
            }
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    const cannotEdit = userMe?.userRole !== 'SUPER_ADMIN' && initialValues.geoCustomZoneType === 'COMMON';

    const label = uuid ? 'Modifier une zone' : 'Ajouter une zone';

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <h1>{label}</h1>
            {error ? (
                <ErrorCard>
                    <p>Voir les indications ci-dessous pour plus d&apos;info</p>
                </ErrorCard>
            ) : null}
            {cannotEdit ? (
                <InfoCard withCloseButton={false}>
                    <p>Vous ne pouvez pas modifier cette zone car elle est gérée niveau global</p>
                </InfoCard>
            ) : null}

            <Select
                mt="md"
                label="Catégorie"
                placeholder="Aucune catégorie"
                description="Ne sélectionner aucune catégorie pour donner une couleur spécifique à cette zone"
                clearable
                data={geoCustomZoneCategories.map((category) => ({
                    value: category.uuid,
                    label: category.name,
                }))}
                key={form.key('geoCustomZoneCategoryUuid')}
                {...form.getInputProps('geoCustomZoneCategoryUuid')}
            />

            <TextInput
                mt="md"
                withAsterisk
                label="Nom de la zone"
                disabled={cannotEdit}
                placeholder="Ma zone"
                key={form.key('name')}
                {...form.getInputProps('name')}
            />
            <TextInput
                mt="md"
                label="Nom court de la zone"
                disabled={cannotEdit}
                placeholder="Zone"
                key={form.key('nameShort')}
                {...form.getInputProps('nameShort')}
            />
            {!form.getValues().geoCustomZoneCategoryUuid ? (
                <ColorInput
                    mt="md"
                    withAsterisk
                    label="Couleur de la zone"
                    placeholder="#000000"
                    disabled={cannotEdit}
                    key={form.key('color')}
                    {...form.getInputProps('color')}
                />
            ) : null}
            {userMe?.userRole === 'SUPER_ADMIN' ? (
                <Select
                    allowDeselect={false}
                    label="Statut"
                    withAsterisk
                    mt="md"
                    data={geoCustomZoneStatuses.map((role) => ({
                        value: role,
                        label: GEO_CUSTOM_ZONE_STATUSES_NAMES_MAP[role],
                    }))}
                    key={form.key('geoCustomZoneStatus')}
                    {...form.getInputProps('geoCustomZoneStatus')}
                />
            ) : null}

            {userMe?.userRole === 'SUPER_ADMIN' ? (
                <Select
                    allowDeselect={false}
                    label="Type"
                    withAsterisk
                    disabled={cannotEdit}
                    mt="md"
                    description={`Le type '${GEO_CUSTOM_ZONE_TYPES_NAMES_MAP.COLLECTIVITY_MANAGED}' signifie que la zone peut être géré par la ou les collectivités qui ont accès`}
                    data={geoCustomZoneTypes.map((role) => ({
                        value: role,
                        label: GEO_CUSTOM_ZONE_TYPES_NAMES_MAP[role],
                    }))}
                    key={form.key('geoCustomZoneType')}
                    {...form.getInputProps('geoCustomZoneType')}
                />
            ) : null}

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

                <Button
                    disabled={mutation.status === 'pending' || cannotEdit}
                    type="submit"
                    leftSection={<IconHexagonPlus2 />}
                >
                    {label}
                </Button>
            </div>
        </form>
    );
};

const fetchGeoCustomZoneCategories = async () => {
    const response = await api.get<GeoCustomZoneCategory[]>(customZoneEndpoints.category.list);
    return response.data;
};

const getEmptyFormValues = (userRole: UserRole): FormValues => {
    const emptyFormValues: FormValues = {
        name: '',
        nameShort: '',
        color: '',
        geoCustomZoneStatus: 'ACTIVE',
        geoCustomZoneType: 'COLLECTIVITY_MANAGED',
        communesUuids: [],
        departmentsUuids: [],
        regionsUuids: [],
        geoCustomZoneCategoryUuid: undefined,
    };

    if (userRole === 'SUPER_ADMIN') {
        emptyFormValues.geoCustomZoneType = 'COMMON';
    }

    return emptyFormValues;
};

interface ComponentInnerProps {
    uuid?: string;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ uuid }) => {
    const { userMe } = useAuth();

    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const res = await api.get<GeoCustomZoneWithCollectivities>(customZoneEndpoints.detail(uuid), {
            params: {
                with_collectivities: true,
            },
        });
        const initialValues: FormValues = {
            name: res.data.name,
            nameShort: res.data.nameShort,
            color: res.data.color || '',
            geoCustomZoneStatus: res.data.geoCustomZoneStatus,
            geoCustomZoneType: res.data.geoCustomZoneType,
            communesUuids: res.data.communes.map((commune) => commune.uuid),
            departmentsUuids: res.data.departments.map((department) => department.uuid),
            regionsUuids: res.data.regions.map((region) => region.uuid),
            geoCustomZoneCategoryUuid: res.data.geoCustomZoneCategory?.uuid,
        };
        const initialGeoSelectedValues: GeoValues = {
            region: res.data.regions.map((region) => geoZoneToGeoOption(region)),
            department: res.data.departments.map((department) => geoZoneToGeoOption(department)),
            commune: res.data.communes.map((commune) => geoZoneToGeoOption(commune)),
        };

        return { initialValues, initialGeoSelectedValues };
    };

    const { isLoading, error, data } = useQuery({
        queryKey: [customZoneEndpoints.detail(String(uuid))],
        enabled: !!uuid,
        queryFn: () => fetchData(),
    });

    const { data: geoCustomZoneCategories } = useQuery({
        queryKey: [customZoneEndpoints.category.list],
        queryFn: () => fetchGeoCustomZoneCategories(),
    });

    if (isLoading || !geoCustomZoneCategories) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return (
        <Form
            uuid={uuid}
            initialValues={data?.initialValues || getEmptyFormValues(userMe?.userRole || 'ADMIN')}
            initialGeoSelectedValues={data?.initialGeoSelectedValues}
            geoCustomZoneCategories={geoCustomZoneCategories}
        />
    );
};

const Component: React.FC = () => {
    const { uuid } = useParams();

    return (
        <LayoutAdminForm title="Formulaire zone" backText="Liste des zones" backUrl={BACK_URL}>
            <ComponentInner uuid={uuid} />
        </LayoutAdminForm>
    );
};

export default Component;
