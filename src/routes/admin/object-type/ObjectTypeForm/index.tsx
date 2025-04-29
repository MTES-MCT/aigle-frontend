import React, { useState } from 'react';

import { OBJECT_TYPE_POST_ENDPOINT, getObjectTypeDetailEndpoint } from '@/api-endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { ObjectType, ObjectTypeDetail } from '@/models/object-type';
import api from '@/utils/api';
import { Button, ColorInput, NumberInput, TextInput } from '@mantine/core';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { IconCubePlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';

const BACK_URL = '/admin/object-types';

interface FormValues {
    name: string;
    color: string;
    prescriptionDurationYears: number | null;
}

const postForm = async (values: FormValues, uuid?: string) => {
    let response: AxiosResponse<ObjectType>;
    const values_ = {
        ...values,
        prescriptionDurationYears: values.prescriptionDurationYears ? Number(values.prescriptionDurationYears) : null,
    };

    if (uuid) {
        response = await api.patch(getObjectTypeDetailEndpoint(uuid), values_);
    } else {
        response = await api.post(OBJECT_TYPE_POST_ENDPOINT, values_);
    }

    return response.data;
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
}

const Form: React.FC<FormProps> = ({ uuid, initialValues }) => {
    const [error, setError] = useState<AxiosError>();
    const navigate = useNavigate();

    const form: UseFormReturnType<FormValues> = useForm({
        mode: 'uncontrolled',
        initialValues,
        validate: {
            name: isNotEmpty('Le nom du type est requis'),
            color: isNotEmpty('La couleur du type est requise'),
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

                <Button disabled={mutation.status === 'pending'} type="submit" leftSection={<IconCubePlus />}>
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

    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const res = await api.get<ObjectTypeDetail>(getObjectTypeDetailEndpoint(uuid));

        return res.data;
    };

    const {
        isLoading,
        error,
        data: initialValues,
    } = useQuery({
        queryKey: [getObjectTypeDetailEndpoint(String(uuid))],
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
