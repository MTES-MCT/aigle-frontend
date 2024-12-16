import React, { useState } from 'react';

import { USERS_LIST_ENDPOINT } from '@/api-endpoints';
import DataTable from '@/components/admin/DataTable';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import SoloAccordion from '@/components/admin/SoloAccordion';
import PillsDataCell from '@/components/admin/data-cells/PillsDataCell';
import UserGroupRightIcon from '@/components/icons/UserGroupRightIcon';
import DateInfo from '@/components/ui/DateInfo';
import { Uuided } from '@/models/data';
import { User, UserRole, UserUserGroup, userRoles } from '@/models/user';
import { useAuth } from '@/utils/auth-context';
import { ROLES_NAMES_MAP, USER_GROUP_RIGHTS_ORDERED } from '@/utils/constants';
import { Button, Checkbox, Input, Stack, Table } from '@mantine/core';
import { IconSearch, IconUserPlus } from '@tabler/icons-react';
import isEqual from 'lodash/isEqual';
import { Link, useNavigate } from 'react-router-dom';

interface DataFilter {
    email: string;
    roles: UserRole[];
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    email: '',
    roles: [...userRoles].sort(),
};

interface UuidedUserUserGroup extends Uuided {
    userUserGroup: UserUserGroup;
}

const Component: React.FC = () => {
    const { userMe } = useAuth();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<DataFilter>(DATA_FILTER_INITIAL_VALUE);

    return (
        <LayoutAdminBase
            title="Liste des utilisateurs"
            actions={
                <>
                    <Button leftSection={<IconUserPlus />} component={Link} to={'/admin/users/form'}>
                        Ajouter un utilisateur
                    </Button>
                </>
            }
        >
            <DataTable<User, DataFilter>
                endpoint={USERS_LIST_ENDPOINT}
                filter={filter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder="Rechercher un utilisateur"
                            leftSection={<IconSearch size={16} />}
                            value={filter.email}
                            onChange={(event) => {
                                const value = event.currentTarget.value;
                                setFilter((filter) => ({
                                    ...filter,
                                    email: value,
                                }));
                            }}
                        />

                        <Checkbox.Group
                            label="Rôles"
                            value={filter.roles}
                            onChange={(roles) => {
                                setFilter((filter) => ({
                                    ...filter,
                                    roles: (roles as UserRole[]).sort(),
                                }));
                            }}
                        >
                            <Stack gap={0}>
                                {userRoles.map((role) => (
                                    <Checkbox mt="xs" key={role} value={role} label={ROLES_NAMES_MAP[role]} />
                                ))}
                            </Stack>
                        </Checkbox.Group>
                    </SoloAccordion>
                }
                tableHeader={[
                    <Table.Th key="createdAt">Date création</Table.Th>,
                    <Table.Th key="email">Email</Table.Th>,
                    <Table.Th key="role">Rôle</Table.Th>,
                    <Table.Th key="groups">Groupes</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: User) => <DateInfo date={item.createdAt} />,
                    (item: User) => item.email,
                    (item: User) => ROLES_NAMES_MAP[item.userRole],
                    (item: User) => (
                        <PillsDataCell<UuidedUserUserGroup>
                            items={item.userUserGroups.map((userUserGroup) => ({
                                uuid: userUserGroup.userGroup.uuid,
                                userUserGroup,
                            }))}
                            getLabel={(item) => item.userUserGroup.userGroup.name}
                            toLink={
                                userMe?.userRole !== 'SUPER_ADMIN'
                                    ? undefined
                                    : (item) => `/admin/user-groups/form/${item.uuid}`
                            }
                            getLeftSection={(item) => {
                                for (const right of USER_GROUP_RIGHTS_ORDERED) {
                                    if (item.userUserGroup.userGroupRights.includes(right)) {
                                        return <UserGroupRightIcon size={14} userGroupRight={right} />;
                                    }
                                }
                            }}
                        />
                    ),
                ]}
                onItemClick={({ uuid }) => navigate(`/admin/users/form/${uuid}`)}
            />
        </LayoutAdminBase>
    );
};

export default Component;
