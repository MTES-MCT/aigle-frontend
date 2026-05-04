import React, { useState } from 'react';

import { customZoneEndpoints } from '@/api/endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import api, { ApiError } from '@/utils/api';
import { Button, ColorInput, TextInput } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { IconHexagonalPrismPlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { GeoCustomZoneCategory } from '@/models/geo/geo-custom-zone-category';

const BACK_URL = '/admin/custom-zones';

interface FormValues {
    name: string;
    nameShort: string;
    color: string;
}

const postForm = (values: FormValues, uuid?: string) => {
    if (!uuid) {
        return api<GeoCustomZoneCategory>(customZoneEndpoints.category.create, {
            method: 'POST',
            body: values,
        });
    }
    return api<GeoCustomZoneCategory>(customZoneEndpoints.category.detail(uuid), {
        method: 'PATCH',
        body: values,
    });
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
}

const Form: React.FC<FormProps> = ({ uuid, initialValues }: FormProps) => {
    const [error, setError] = useState<ApiError>();
    const navigate = useNavigate();
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues,
    });

    const mutation: UseMutationResult<GeoCustomZoneCategory, ApiError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, uuid),
        onSuccess: () => {
            navigate(BACK_URL);
        },
        onError: (error) => {
            setError(error);
            if (error.body) {
                // @ts-expect-error types do not match
                form.setErrors(error.body);
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
            <TextInput
                mt="md"
                label="Nom court de la catégorie"
                placeholder="Cat"
                key={form.key('nameShort')}
                {...form.getInputProps('nameShort')}
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

                <Button
                    disabled={mutation.status === 'pending'}
                    loading={mutation.status === 'pending'}
                    type="submit"
                    leftSection={<IconHexagonalPrismPlus />}
                >
                    {label}
                </Button>
            </div>
        </form>
    );
};

const EMPTY_FORM_VALUES: FormValues = {
    color: '',
    name: '',
    nameShort: '',
};

interface ComponentInnerProps {
    uuid?: string;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ uuid }) => {
    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const data = await api<GeoCustomZoneCategory>(customZoneEndpoints.category.detail(uuid));
        const initialValues: FormValues = {
            name: data.name,
            nameShort: data.nameShort,
            color: data.color,
        };

        return initialValues;
    };

    const { isLoading, error, data } = useQuery({
        queryKey: [customZoneEndpoints.category.detail(String(uuid))],
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
