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
    IconHistory,
    IconMap,
    IconReportAnalytics,
    IconTerminal,
    IconUser,
    IconUsers,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import classes from './index.module.scss';

const ICON_SIZE = 16;

interface ComponentProps extends PropsWithChildren {
    title?: string;
}

const Component: React.FC<ComponentProps> = ({ children, title }) => {
    const [opened] = useDisclosure();
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
                <Header />
            </AppShell.Header>

            <AppShell.Navbar p="md">
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Données déployées"
                        component={Link}
                        to="/admin/deployed-data"
                        active={pathname.includes('/admin/deployed-data')}
                        leftSection={<IconReportAnalytics size={ICON_SIZE} />}
                    />
                ) : null}
                <NavLink
                    label="Utilisateurs"
                    component={Link}
                    to="/admin/users"
                    active={pathname.includes('/admin/users')}
                    leftSection={<IconUser size={ICON_SIZE} />}
                />
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Groupes utilisateurs"
                        component={Link}
                        to="/admin/user-groups"
                        active={pathname.includes('/admin/user-groups')}
                        leftSection={<IconUsers size={ICON_SIZE} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Collectivités"
                        component={Link}
                        to="/admin/collectivites"
                        active={pathname.includes('/admin/collectivites')}
                        leftSection={<IconBuilding size={ICON_SIZE} />}
                    />
                ) : null}
                <NavLink
                    label="Zones à enjeux"
                    component={Link}
                    to="/admin/custom-zones"
                    active={pathname.includes('/admin/custom-zones')}
                    leftSection={<IconHexagon size={ICON_SIZE} />}
                />

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Types d'objets"
                        component={Link}
                        to="/admin/object-types"
                        active={pathname.includes('/admin/object-types')}
                        leftSection={<IconCube size={ICON_SIZE} />}
                    />
                ) : null}
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Thématiques"
                        component={Link}
                        to="/admin/object-type-categories"
                        active={pathname.includes('/admin/object-type-categories')}
                        leftSection={<IconCategory size={ICON_SIZE} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Fonds de carte"
                        component={Link}
                        to="/admin/tile-sets"
                        active={pathname.includes('/admin/tile-sets')}
                        leftSection={<IconMap size={ICON_SIZE} />}
                    />
                ) : null}
                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Commandes"
                        component={Link}
                        to="/admin/run-command"
                        active={pathname.includes('/admin/run-command')}
                        leftSection={<IconTerminal size={ICON_SIZE} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Imports"
                        component={Link}
                        to="/admin/imports"
                        active={pathname.includes('/admin/imports')}
                        leftSection={<IconDatabaseImport size={ICON_SIZE} />}
                    />
                ) : null}

                {userMe?.userRole === 'SUPER_ADMIN' ? (
                    <NavLink
                        label="Journal des actions"
                        component={Link}
                        to="/admin/user-action-logs"
                        active={pathname.includes('/admin/user-action-logs')}
                        leftSection={<IconHistory size={ICON_SIZE} />}
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
