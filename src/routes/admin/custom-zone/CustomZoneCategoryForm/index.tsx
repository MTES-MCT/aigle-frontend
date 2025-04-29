import React, { useState } from 'react';

import {
    GEO_CUSTOM_ZONE_CATEGORY_POST_ENDPOINT,
    getGeoCustomZoneCategoryDetailEndpoint,
    getGeoCustomZoneDetailEndpoint,
} from '@/api-endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import api from '@/utils/api';
import { Button, ColorInput, TextInput } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { IconHexagonalPrismPlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { GeoCustomZoneCategory } from '@/models/geo/geo-custom-zone-category';

const BACK_URL = '/admin/custom-zones';

interface FormValues {
    name: string;
    color: string;
}

const postForm = async (values: FormValues, uuid?: string) => {
    if (!uuid) {
        const response = await api.post(GEO_CUSTOM_ZONE_CATEGORY_POST_ENDPOINT, values);
        return response.data;
    } else {
        const response = await api.patch(getGeoCustomZoneCategoryDetailEndpoint(uuid), values);
        return response.data;
    }
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
}

const Form: React.FC<FormProps> = ({ uuid, initialValues }: FormProps) => {
    const [error, setError] = useState<AxiosError>();
    const navigate = useNavigate();
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues,
    });

    const mutation: UseMutationResult<void, AxiosError, FormValues> = useMutation({
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
    const label = uuid ? 'Modifier une catégorie' : 'Ajouter une catégorie';

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
                label="Nom de la catégorie"
                placeholder="Ma catégorie"
                key={form.key('name')}
                {...form.getInputProps('name')}
            />
            <ColorInput
                mt="md"
                withAsterisk
                label="Couleur de la catégorie"
                placeholder="#000000"
                key={form.key('color')}
                {...form.getInputProps('color')}
            />

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

                <Button disabled={mutation.status === 'pending'} type="submit" leftSection={<IconHexagonalPrismPlus />}>
                    {label}
                </Button>
            </div>
        </form>
    );
};

const EMPTY_FORM_VALUES: FormValues = {
    color: '',
    name: '',
};

interface ComponentInnerProps {
    uuid?: string;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ uuid }) => {
    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const res = await api.get<GeoCustomZoneCategory>(getGeoCustomZoneCategoryDetailEndpoint(uuid));
        const initialValues: FormValues = {
            name: res.data.name,
            color: res.data.color,
        };

        return initialValues;
    };

    const { isLoading, error, data } = useQuery({
        queryKey: [getGeoCustomZoneDetailEndpoint(String(uuid))],
        enabled: !!uuid,
        queryFn: () => fetchData(),
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return <Form uuid={uuid} initialValues={data || EMPTY_FORM_VALUES} />;
};

const Component: React.FC = () => {
    const { uuid } = useParams();

    return (
        <LayoutAdminForm title="Formulaire catégorie de zone" backText="Liste des zones" backUrl={BACK_URL}>
            <ComponentInner uuid={uuid} />
        </LayoutAdminForm>
    );
};

export default Component;
