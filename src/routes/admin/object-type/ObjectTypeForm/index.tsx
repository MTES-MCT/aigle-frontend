import React, { useState } from 'react';

import {
    OBJECT_TYPE_CATEGORY_LIST_ENDPOINT,
    OBJECT_TYPE_POST_ENDPOINT,
    getObjectTypeDetailEndpoint,
} from '@/api-endpoints';
import ErrorCard from '@/components/ErrorCard';
import Loader from '@/components/Loader';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import { ObjectType, ObjectTypeDetail } from '@/models/object-type';
import { ObjectTypeCategory } from '@/models/object-type-category';
import api from '@/utils/api';
import { Button, ColorInput, MultiSelect, TextInput } from '@mantine/core';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { IconCheck, IconCubePlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';

const BACK_URL = '/admin/object-types';

interface FormValues {
    name: string;
    color: string;
    categoriesUuids: string[];
}

const postForm = async (values: FormValues, uuid?: string) => {
    let response: AxiosResponse<ObjectType>;

    if (uuid) {
        response = await api.patch(getObjectTypeDetailEndpoint(uuid), values);
    } else {
        response = await api.post(OBJECT_TYPE_POST_ENDPOINT, values);
    }

    return response.data;
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
    categories?: ObjectTypeCategory[];
}

const Form: React.FC<FormProps> = ({ uuid, initialValues, categories }) => {
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
                    <p>Erreur lors de l&apos;ajout du type</p>
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
            <MultiSelect
                mt="md"
                label="Thématiques"
                placeholder="Déchets, constructions,..."
                searchable
                data={(categories || []).map(({ name, uuid }) => ({
                    value: uuid,
                    label: name,
                }))}
                renderOption={(item) => (
                    <div className="multi-select-item">
                        <div className="multi-select-item-label">{item.option.label}</div>
                        {item.checked ? <IconCheck className="multi-select-item-icon" color="grey" /> : null}
                    </div>
                )}
                key={form.key('categoriesUuids')}
                {...form.getInputProps('categoriesUuids')}
            />

            <div className="form-actions">
                <Button type="button" variant="outline" component={Link} to={BACK_URL}>
                    Annuler
                </Button>

                <Button type="submit" leftSection={<IconCubePlus />}>
                    {label}
                </Button>
            </div>
        </form>
    );
};

const EMPTY_FORM_VALUES: FormValues = {
    name: '',
    color: '',
    categoriesUuids: [],
};

const ComponentInner: React.FC = () => {
    const { uuid } = useParams();

    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const res = await api.get<ObjectTypeDetail>(getObjectTypeDetailEndpoint(uuid));
        const initialValues: FormValues = {
            categoriesUuids: res.data.categories.map((cat) => cat.uuid),
            ...res.data,
        };

        return initialValues;
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

    const fetchObjectTypeCategories = async () => {
        const res = await api.get<ObjectType[]>(OBJECT_TYPE_CATEGORY_LIST_ENDPOINT);
        return res.data;
    };

    const { data: categories } = useQuery({
        queryKey: [OBJECT_TYPE_CATEGORY_LIST_ENDPOINT],
        queryFn: () => fetchObjectTypeCategories(),
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return <Form uuid={uuid} initialValues={initialValues || EMPTY_FORM_VALUES} categories={categories} />;
};

const Component: React.FC = () => {
    return (
        <LayoutAdminForm backText="Liste des types d'objets" backUrl={BACK_URL}>
            <ComponentInner />
        </LayoutAdminForm>
    );
};

export default Component;
