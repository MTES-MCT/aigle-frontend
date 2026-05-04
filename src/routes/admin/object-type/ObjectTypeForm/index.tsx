import React, { useState } from 'react';

import { objectTypeEndpoints } from '@/api/endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { ObjectType, ObjectTypeDetail } from '@/models/object-type';
import api, { ApiError } from '@/utils/api';
import { Button, ColorInput, NumberInput, TextInput } from '@mantine/core';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { IconCubePlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

const BACK_URL = '/admin/object-types';

interface FormValues {
    name: string;
    color: string;
    prescriptionDurationYears: number | null;
}

const postForm = (values: FormValues, uuid?: string) => {
    const values_ = {
        ...values,
        prescriptionDurationYears: values.prescriptionDurationYears ? Number(values.prescriptionDurationYears) : null,
    };

    if (uuid) {
        return api<ObjectType>(objectTypeEndpoints.detail(uuid), { method: 'PATCH', body: values_ });
    }
    return api<ObjectType>(objectTypeEndpoints.create, { method: 'POST', body: values_ });
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
}

const Form: React.FC<FormProps> = ({ uuid, initialValues }) => {
    const [error, setError] = useState<ApiError>();
    const navigate = useNavigate();

    const form: UseFormReturnType<FormValues> = useForm({
        mode: 'uncontrolled',
        initialValues,
        validate: {
            name: isNotEmpty('Le nom du type est requis'),
            color: isNotEmpty('La couleur du type est requise'),
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

    const label = uuid ? "Modifier un type d'objet" : "Ajouter un type d'objet";

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
                label="Nom du type d'objet"
                placeholder="Mon type"
                key={form.key('name')}
                {...form.getInputProps('name')}
            />
            <ColorInput
                mt="md"
                withAsterisk
                label="Couleur du type d'objet"
                placeholder="#000000"
                key={form.key('color')}
                {...form.getInputProps('color')}
            />
            <NumberInput
                mt="md"
                label="Prescription (en années)"
                description="Laisser vide si la prescription ne s'applique pas à ce type d'objet"
                placeholder="5"
                min={0}
                allowNegative={false}
                key={form.key('prescriptionDurationYears')}
                {...form.getInputProps('prescriptionDurationYears')}
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
                    leftSection={<IconCubePlus />}
                >
                    {label}
                </Button>
            </div>
        </form>
    );
};

const EMPTY_FORM_VALUES: FormValues = {
    name: '',
    color: '',
    prescriptionDurationYears: null,
};

const ComponentInner: React.FC = () => {
    const { uuid } = useParams();

    const fetchData = () => {
        if (!uuid) {
            return Promise.resolve(undefined);
        }
        return api<ObjectTypeDetail>(objectTypeEndpoints.detail(uuid));
    };

    const {
        isLoading,
        error,
        data: initialValues,
    } = useQuery({
        queryKey: [objectTypeEndpoints.detail(String(uuid))],
        enabled: !!uuid,
        queryFn: () => fetchData(),
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return <Form uuid={uuid} initialValues={initialValues || EMPTY_FORM_VALUES} />;
};

const Component: React.FC = () => {
    return (
        <LayoutAdminForm title="Formulaire type d'objet" backText="Liste des types d'objets" backUrl={BACK_URL}>
            <ComponentInner />
        </LayoutAdminForm>
    );
};

export default Component;
