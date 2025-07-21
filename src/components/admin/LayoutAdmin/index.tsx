import React, { PropsWithChildren } from 'react';

import Header from '@/components/Header';
import { useAuth } from '@/store/slices/auth';
import { getPageTitle } from '@/utils/html';
import { AppShell, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconBuilding,
    IconCategory,
    IconCube,
    IconDatabaseImport,
    IconHexagon,
    IconMap,
    IconTerminal,
    IconUser,
    IconUsers,
} from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import classes from './index.module.scss';

const ICON_SIZE = 16;

interface ComponentProps extends PropsWithChildren {
    title?: string;
}

const Component: React.FC<ComponentProps> = ({ children, title }) => {
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
                    leftSection={<IconUser size={ICON_SIZE} />}
                />
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Groupes utilisateurs"
                        href="/admin/user-groups"
                        active={pathname.includes('/admin/user-groups')}
                        leftSection={<IconUsers size={ICON_SIZE} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Collectivités"
                        href="/admin/collectivites"
                        active={pathname.includes('/admin/collectivites')}
                        leftSection={<IconBuilding size={ICON_SIZE} />}
                    />
                ) : null}
                <NavLink
                    label="Zones à enjeux"
                    href="/admin/custom-zones"
                    active={pathname.includes('/admin/custom-zones')}
                    leftSection={<IconHexagon size={ICON_SIZE} />}
                />

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Types d'objets"
                        href="/admin/object-types"
                        active={pathname.includes('/admin/object-types')}
                        leftSection={<IconCube size={ICON_SIZE} />}
                    />
                ) : null}
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Thématiques"
                        href="/admin/object-type-categories"
                        active={pathname.includes('/admin/object-type-categories')}
                        leftSection={<IconCategory size={ICON_SIZE} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Fonds de carte"
                        href="/admin/tile-sets"
                        active={pathname.includes('/admin/tile-sets')}
                        leftSection={<IconMap size={ICON_SIZE} />}
                    />
                ) : null}
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Commandes"
                        href="/admin/run-command"
                        active={pathname.includes('/admin/run-command')}
                        leftSection={<IconTerminal size={ICON_SIZE} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Imports"
                        href="/admin/imports"
                        active={pathname.includes('/admin/imports')}
                        leftSection={<IconDatabaseImport size={ICON_SIZE} />}
                    />
                ) : null}
            </AppShell.Navbar>

            <AppShell.Main m="md">
                <title>{getPageTitle(`[admin] ${title}`)}</title>
                <div className={classes['content-container']}>
                    <div className={classes['content']}>{children}</div>
                </div>
            </AppShell.Main>
        </AppShell>
    );
};

export default Component;
