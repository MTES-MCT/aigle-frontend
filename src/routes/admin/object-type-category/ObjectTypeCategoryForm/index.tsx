import React, { useMemo, useState } from 'react';

import {
    OBJECT_TYPE_CATEGORY_POST_ENDPOINT,
    OBJECT_TYPE_LIST_ENDPOINT,
    getObjectTypeCategoryDetailEndpoint,
} from '@/api-endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import SelectItem from '@/components/ui/SelectItem';
import { ObjectType } from '@/models/object-type';
import {
    ObjectTypeCategory,
    ObjectTypeCategoryDetail,
    ObjectTypeCategoryObjectTypeStatus,
    objectTypeCategoryObjectTypeStatuses,
} from '@/models/object-type-category';
import api from '@/utils/api';
import { OBJECT_TYPE_CATEGROY_OBJECT_TYPE_STATUSES_NAMES_MAP } from '@/utils/constants';
import { ActionIcon, Autocomplete, Button, Group, Select, Table, TextInput } from '@mantine/core';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { IconCubePlus, IconTrash } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';

const BACK_URL = '/admin/object-type-categories';

interface ObjectTypeCategoryObjectTypeInput {
    objectTypeUuid: string;
    objectTypeCategoryObjectTypeStatus: ObjectTypeCategoryObjectTypeStatus;
}

interface FormValues {
    name: string;
    objectTypeCategoryObjectTypes: ObjectTypeCategoryObjectTypeInput[];
}

const postForm = async (values: FormValues, uuid?: string) => {
    let response: AxiosResponse<ObjectTypeCategory>;

    if (uuid) {
        response = await api.patch(getObjectTypeCategoryDetailEndpoint(uuid), values);
    } else {
        response = await api.post(OBJECT_TYPE_CATEGORY_POST_ENDPOINT, values);
    }

    return response.data;
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
    objectTypes?: ObjectType[];
}

const Form: React.FC<FormProps> = ({ uuid, initialValues, objectTypes }) => {
    const [error, setError] = useState<AxiosError>();
    const navigate = useNavigate();

    const [searchObjectTypeValue, setSearchObjectTypeValue] = useState('');

    const form: UseFormReturnType<FormValues> = useForm({
        mode: 'uncontrolled',
        initialValues,
        validate: {
            name: isNotEmpty('Le nom de la thématique est requis'),
        },
    });

    const mutation: UseMutationResult<ObjectTypeCategory, AxiosError, FormValues> = useMutation({
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

    const label = uuid ? 'Modifier une thématique' : 'Ajouter une thématique';

    const objectTypesMap: Record<string, ObjectType> = useMemo(() => {
        return (objectTypes || []).reduce(
            (prev, curr) => ({
                ...prev,
                [curr.uuid]: curr,
            }),
            {},
        );
    }, [objectTypes]);

    const objectTypeCategoryObjectTypesUuidsSelected = form
        .getValues()
        .objectTypeCategoryObjectTypes.map(({ objectTypeUuid }) => objectTypeUuid);
    const objectTypesOptions = (objectTypes || [])
        .filter((ot) => !objectTypeCategoryObjectTypesUuidsSelected.includes(ot.uuid))
        .map(({ name, uuid }) => ({
            value: uuid,
            label: name,
        }));

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
                label="Nom de la thématique"
                placeholder="Ma thématique"
                key={form.key('name')}
                {...form.getInputProps('name')}
            />

            <h2 className="form-sub-title">Types d&apos;objets associés</h2>
            <Autocomplete
                mt="md"
                label="Ajouter un type d'objet"
                placeholder="Rechercher un type d'objet"
                data={objectTypesOptions}
                onOptionSubmit={(value) => {
                    form.setFieldValue('objectTypeCategoryObjectTypes', [
                        ...form.getValues().objectTypeCategoryObjectTypes,
                        { objectTypeUuid: value, objectTypeCategoryObjectTypeStatus: 'VISIBLE' },
                    ]);
                    setSearchObjectTypeValue('');
                }}
                renderOption={(item) => <SelectItem item={item} color={objectTypesMap[item.option.value].color} />}
                value={searchObjectTypeValue}
                onChange={setSearchObjectTypeValue}
            />

            <h3 className="form-sub-sub-title">Types d&apos; objets et leur statuts</h3>

            {objectTypes ? (
                <Table withRowBorders={false} layout="fixed">
                    <Table.Tbody>
                        {form.getValues().objectTypeCategoryObjectTypes.map(({ objectTypeUuid }, index) => (
                            <Table.Tr key={objectTypeUuid}>
                                <Table.Td>{objectTypesMap[objectTypeUuid].name}</Table.Td>
                                <Table.Td colSpan={2}>
                                    <Group align="flex-end">
                                        <Select
                                            flex={1}
                                            mt="md"
                                            label="Statut"
                                            placeholder="Visible, caché,..."
                                            renderOption={(item) => <SelectItem item={item} />}
                                            data={objectTypeCategoryObjectTypeStatuses.map((status) => ({
                                                value: status,
                                                label: OBJECT_TYPE_CATEGROY_OBJECT_TYPE_STATUSES_NAMES_MAP[status],
                                            }))}
                                            key={form.key(
                                                `objectTypeCategoryObjectTypes.${index}.objectTypeCategoryObjectTypeStatus`,
                                            )}
                                            {...form.getInputProps(
                                                `objectTypeCategoryObjectTypes.${index}.objectTypeCategoryObjectTypeStatus`,
                                            )}
                                        />

                                        <ActionIcon
                                            variant="transparent"
                                            onClick={() => form.removeListItem('objectTypeCategoryObjectTypes', index)}
                                        >
                                            <IconTrash />
                                        </ActionIcon>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}

                        {form.getValues().objectTypeCategoryObjectTypes.length === 0 ? (
                            <Table.Tr>
                                <Table.Td className="empty-results-cell" colSpan={3}>
                                    Cet thématique n&apos;a aucune type d&apos;objet associé
                                </Table.Td>
                            </Table.Tr>
                        ) : null}
                    </Table.Tbody>
                </Table>
            ) : (
                <Loader />
            )}

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

const fetchObjectTypes = async () => {
    const res = await api.get<ObjectType[]>(OBJECT_TYPE_LIST_ENDPOINT);
    return res.data;
};

const EMPTY_FORM_VALUES: FormValues = {
    name: '',
    objectTypeCategoryObjectTypes: [],
} as const;

const ComponentInner: React.FC = () => {
    const { uuid } = useParams();

    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const res = await api.get<ObjectTypeCategoryDetail>(getObjectTypeCategoryDetailEndpoint(uuid));
        const initialValues: FormValues = {
            ...res.data,
            objectTypeCategoryObjectTypes: res.data.objectTypeCategoryObjectTypes.map(
                ({ objectType, objectTypeCategoryObjectTypeStatus }) => ({
                    objectTypeUuid: objectType.uuid,
                    objectTypeCategoryObjectTypeStatus,
                }),
            ),
        };

        return initialValues;
    };

    const {
        isLoading,
        error,
        data: initialValues,
    } = useQuery({
        queryKey: [getObjectTypeCategoryDetailEndpoint(String(uuid))],
        enabled: !!uuid,
        queryFn: () => fetchData(),
    });

    const { data: objectTypes } = useQuery({
        queryKey: [OBJECT_TYPE_LIST_ENDPOINT],
        queryFn: () => fetchObjectTypes(),
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return <Form uuid={uuid} initialValues={initialValues || EMPTY_FORM_VALUES} objectTypes={objectTypes} />;
};

const Component: React.FC = () => {
    return (
        <LayoutAdminForm title="Formulaire thématique" backText="Liste des thématiques" backUrl={BACK_URL}>
            <ComponentInner />
        </LayoutAdminForm>
    );
};

export default Component;
