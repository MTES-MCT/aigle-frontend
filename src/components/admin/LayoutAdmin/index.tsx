import React, { PropsWithChildren } from 'react';

import Header from '@/components/Header';
import { useAuth } from '@/utils/auth-context';
import { AppShell, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconBuilding,
    IconCategory,
    IconCube,
    IconDatabaseImport,
    IconHexagon,
    IconMap,
    IconUser,
    IconUsers,
} from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import classes from './index.module.scss';

const Component: React.FC<PropsWithChildren> = ({ children }) => {
    const [opened, { toggle }] = useDisclosure();
    const { pathname } = useLocation();
    const { userMe } = useAuth();

    return (
        <AppShell
            header={{
                height: 116.5,
            }}
            navbar={{
                width: 300,
                breakpoint: 'md',
                collapsed: { mobile: !opened },
            }}
        >
            <AppShell.Header>
                <Header burgerState={{ opened, toggle }} />
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <NavLink
                    label="Utilisateurs"
                    href="/admin/users"
                    active={pathname.includes('/admin/users')}
                    leftSection={<IconUser size={16} />}
                />
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Groupes utilisateurs"
                        href="/admin/user-groups"
                        active={pathname.includes('/admin/user-groups')}
                        leftSection={<IconUsers size={16} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Collectivités"
                        href="/admin/collectivites"
                        active={pathname.includes('/admin/collectivites')}
                        leftSection={<IconBuilding size={16} />}
                    />
                ) : null}
                <NavLink
                    label="Zones"
                    href="/admin/custom-zones"
                    active={pathname.includes('/admin/custom-zones')}
                    leftSection={<IconHexagon size={16} />}
                />

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Types d'objets"
                        href="/admin/object-types"
                        active={pathname.includes('/admin/object-types')}
                        leftSection={<IconCube size={16} />}
                    />
                ) : null}
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Thématiques"
                        href="/admin/object-type-categories"
                        active={pathname.includes('/admin/object-type-categories')}
                        leftSection={<IconCategory size={16} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Fonds de carte"
                        href="/admin/tile-sets"
                        active={pathname.includes('/admin/tile-sets')}
                        leftSection={<IconMap size={16} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Imports"
                        href="/admin/imports"
                        active={pathname.includes('/admin/imports')}
                        leftSection={<IconDatabaseImport size={16} />}
                    />
                ) : null}
            </AppShell.Navbar>

            <AppShell.Main m="md">
                <div className={classes['content-container']}>
                    <div className={classes['content']}>{children}</div>
                </div>
            </AppShell.Main>
        </AppShell>
    );
};

export default Component;
