import React, { useMemo, useState } from 'react';

import { userGroupEndpoints, usersEndpoints } from '@/api/endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import SelectItem from '@/components/ui/SelectItem';
import { useFilterNavigation } from '@/hooks/useFilterNavigation';
import { ObjectType } from '@/models/object-type';
import { SelectOption } from '@/models/ui/select-option';
import { User, UserRole, UserUserGroupInput, userGroupRights, userRoles } from '@/models/user';
import { UserGroup, UserGroupDetail } from '@/models/user-group';
import { useAuth } from '@/store/slices/auth';
import api, { ApiError } from '@/utils/api';
import { PASSWORD_MIN_LENGTH, ROLES_NAMES_MAP, USER_GROUP_RIGHTS_NAMES_MAP } from '@/utils/constants';
import {
    ActionIcon,
    Autocomplete,
    Button,
    Checkbox,
    Group,
    MultiSelect,
    PasswordInput,
    Select,
    Table,
    TextInput,
} from '@mantine/core';
import { UseFormReturnType, isEmail, isNotEmpty, useForm } from '@mantine/form';
import { IconTrash, IconUserPlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import omit from 'lodash/omit';
import { Link, useParams } from 'react-router-dom';

const BACK_URL = '/admin/users';

const generateRandomPassword = (): string => {
    const length = PASSWORD_MIN_LENGTH * 2;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

interface FormValues {
    email: string;
    userRole: UserRole;
    password: string;
    isStaff: boolean;
    userUserGroups: UserUserGroupInput[];
}

const postForm = (values: FormValues, uuid?: string) => {
    if (uuid) {
        const values_ = values.password.length === 0 ? omit(values, 'password') : values;
        return api<ObjectType>(usersEndpoints.detail(uuid), { method: 'PATCH', body: values_ });
    }
    return api<ObjectType>(usersEndpoints.create, { method: 'POST', body: values });
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
    userGroups: UserGroup[];
}

const Form: React.FC<FormProps> = ({ uuid, initialValues, userGroups }) => {
    const [error, setError] = useState<ApiError>();
    const { navigate, buildPath } = useFilterNavigation();
    const { userMe } = useAuth();

    const [searchGroupValue, setSearchGroupValue] = useState('');

    const form: UseFormReturnType<FormValues> = useForm({
        mode: 'uncontrolled',
        initialValues,
        validate: {
            email: isEmail("Le format de l'adresse mail est invalide"),
            userRole: isNotEmpty("Le rôle de l'utilisateur est requis"),
            password: (value) => {
                if (uuid && !value.length) {
                    return null;
                }

                if (value.length < PASSWORD_MIN_LENGTH) {
                    return `Le mot de passe doit faire minimum ${PASSWORD_MIN_LENGTH} caractères`;
                }

                return null;
            },
            userUserGroups: {
                userGroupRights: (value) => {
                    if (!value.length) {
                        return 'Le groupe doit être associé à un droit minimum';
                    }

                    return null;
                },
            },
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

    const label = uuid ? 'Modifier un utilisateur' : 'Ajouter un utilisateur';

    const userUserGroupsMap: {
        [uuid: string]: UserGroup;
    } = useMemo(
        () =>
            userGroups?.reduce(
                (prev, userGroup) => ({
                    ...prev,
                    [userGroup.uuid]: userGroup,
                }),
                {},
            ) || {},
        [userGroups],
    );
    const userUserGroupsOptions: SelectOption[] = useMemo(() => {
        if (!userGroups) {
            return [];
        }

        const userGoupUuids = form.getValues().userUserGroups.map((userUserGroup) => userUserGroup.userGroupUuid);

        return userGroups
            .filter((userGroup) => !userGoupUuids.includes(userGroup.uuid))
            .map((userGroup) => ({
                label: userGroup.name,
                value: userGroup.uuid,
            }));
    }, [userGroups, form.getValues().userUserGroups]);

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
                label="Email"
                autoComplete="off"
                placeholder="john.doe@mail.com"
                key={form.key('email')}
                {...form.getInputProps('email')}
            />
            <PasswordInput
                mt="md"
                withAsterisk={!uuid}
                label="Mot de passe"
                description={uuid ? 'Remplir ce champ pour modifier le mot de passe' : undefined}
                placeholder="••••••••"
                autoComplete="new-password"
                key={form.key('password')}
                {...form.getInputProps('password')}
            />
            <Button mt="xs" variant="light" onClick={() => form.setFieldValue('password', generateRandomPassword())}>
                Générer un mot de passe aléatoire
            </Button>
            <Checkbox
                mt="md"
                label="Membre du staff"
                key={form.key('isStaff')}
                {...form.getInputProps('isStaff', { type: 'checkbox' })}
            />
            <Select
                allowDeselect={false}
                label="Rôle"
                withAsterisk
                disabled={userMe?.userRole === 'ADMIN'}
                mt="md"
                data={userRoles.map((role) => ({
                    value: role,
                    label: ROLES_NAMES_MAP[role],
                }))}
                key={form.key('userRole')}
                {...form.getInputProps('userRole')}
            />

            <h2 className="form-sub-title">Groupes</h2>
            <Autocomplete
                mt="md"
                label="Ajouter un groupe"
                placeholder="Rechercher un groupe"
                data={userUserGroupsOptions}
                onOptionSubmit={(value) => {
                    form.setFieldValue('userUserGroups', [
                        ...form.getValues().userUserGroups,
                        { userGroupUuid: value, userGroupRights: ['READ'] },
                    ]);
                    setSearchGroupValue('');
                }}
                value={searchGroupValue}
                onChange={setSearchGroupValue}
            />

            <h3 className="form-sub-sub-title">Groupes de l&apos;utilisateur</h3>
            <Table withRowBorders={false} layout="fixed">
                <Table.Tbody>
                    {form.getValues().userUserGroups.map((userUserGroup, index) => (
                        <Table.Tr key={userUserGroup.userGroupUuid}>
                            <Table.Td>{userUserGroupsMap[userUserGroup.userGroupUuid].name}</Table.Td>
                            <Table.Td colSpan={2}>
                                <Group align="flex-end">
                                    <MultiSelect
                                        flex={1}
                                        mt="md"
                                        label="Droits"
                                        placeholder="Lecture, écriture,..."
                                        renderOption={(item) => <SelectItem item={item} />}
                                        data={userGroupRights.map((right) => ({
                                            value: right,
                                            label: USER_GROUP_RIGHTS_NAMES_MAP[right],
                                        }))}
                                        key={form.key(`userUserGroups.${index}.userGroupRights`)}
                                        {...form.getInputProps(`userUserGroups.${index}.userGroupRights`)}
                                    />

                                    <ActionIcon
                                        variant="transparent"
                                        onClick={() => form.removeListItem('userUserGroups', index)}
                                    >
                                        <IconTrash />
                                    </ActionIcon>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}

                    {form.getValues().userUserGroups.length === 0 ? (
                        <Table.Tr>
                            <Table.Td className="empty-results-cell" colSpan={3}>
                                Cet utilisateur n&apos;appartient à acucun groupe
                            </Table.Td>
                        </Table.Tr>
                    ) : null}
                </Table.Tbody>
            </Table>

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
    email: '',
    userRole: 'REGULAR',
    password: '',
    isStaff: false,
    userUserGroups: [],
};

const ComponentInner: React.FC = () => {
    const { uuid } = useParams();

    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const user = await api<User>(usersEndpoints.detail(uuid));
        return {
            ...user,
            password: '',
            userUserGroups: user.userUserGroups.map((userUserGroup) => ({
                userGroupUuid: userUserGroup.userGroup.uuid,
                userGroupRights: userUserGroup.userGroupRights,
            })),
        };
    };

    const {
        isLoading,
        error,
        data: initialValues,
    } = useQuery({
        queryKey: [usersEndpoints.detail(String(uuid))],
        enabled: !!uuid,
        queryFn: () => fetchData(),
    });

    const fetchUserGroups = () => api<UserGroupDetail[]>(userGroupEndpoints.list);

    const { data: userGroups, isLoading: userGroupsIsLoading } = useQuery({
        queryKey: [userGroupEndpoints.list],
        queryFn: () => fetchUserGroups(),
    });

    if (isLoading || userGroupsIsLoading) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return <Form uuid={uuid} initialValues={initialValues || EMPTY_FORM_VALUES} userGroups={userGroups || []} />;
};

const Component: React.FC = () => {
    return (
        <LayoutAdminForm title="Formulaire utilisateur" backText="Liste des utilisateurs" backUrl={BACK_URL}>
            <ComponentInner />
        </LayoutAdminForm>
    );
};

export default Component;
