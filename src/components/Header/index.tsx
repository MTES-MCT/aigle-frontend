import React, { useMemo } from 'react';

import logoSmallImg from '@/assets/logo_small.png';
import { useAuth } from '@/utils/auth-context';
import { DEFAULT_ROUTE, ROLES_NAMES_MAP } from '@/utils/constants';
import { getColorFromString, getEmailInitials } from '@/utils/string';
import { Avatar, Burger, Button, Image, Menu, Tabs } from '@mantine/core';
import {
    IconAdjustments,
    IconHelp,
    IconInfoCircle,
    IconLogout,
    IconMap,
    IconReportAnalytics,
} from '@tabler/icons-react';
import clsx from 'clsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import classes from './index.module.scss';

type TabValue = 'map' | 'admin' | 'statistics' | 'about' | 'help';

const getTabeValue = (pathname: string): TabValue => {
    if (pathname.includes('/map')) {
        return 'map';
    }

    if (pathname.includes('/statistics')) {
        return 'statistics';
    }

    if (pathname.includes('/about')) {
        return 'about';
    }

    if (pathname.includes('/help')) {
        return 'help';
    }

    return 'admin';
};

interface AvatarState {
    initials?: string;
    color?: string;
}

interface BurgerState {
    opened: boolean;
    toggle: () => void;
}

interface ComponentProps {
    burgerState?: BurgerState;
}

const Component: React.FC<ComponentProps> = ({ burgerState }) => {
    const { userMe, logout } = useAuth();
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const avatarState: AvatarState = useMemo(
        () =>
            userMe?.email
                ? {
                      initials: getEmailInitials(userMe.email),
                      color: getColorFromString(userMe.email),
                  }
                : {},
        [userMe?.email],
    );

    const onTabChange = (tab: TabValue) => {
        if (tab === 'map') {
            navigate('/map');
        } else if (tab === 'statistics') {
            navigate('/statistics');
        } else if (tab === 'about') {
            navigate('/about');
        } else if (tab === 'help') {
            navigate('/help');
        } else {
            navigate('/admin');
        }
    };

    return (
        <header role="banner" className={clsx(classes.container, 'fr-header')}>
            <div className="fr-header__body">
                <div className="fr-container">
                    <div className="fr-header__body-row">
                        <div className="fr-header__brand fr-enlarge-link">
                            <div className="fr-header__brand-top">
                                <div className="fr-header__logo">
                                    <p className="fr-logo">
                                        Ministère de la
                                        <br />
                                        transition écologique
                                    </p>
                                </div>
                            </div>
                            <div className="fr-header__service">
                                <a
                                    href="/"
                                    title="Accueil - [À MODIFIER - Nom du site / service] - Nom de l’entité (ministère, secrétariat d‘état, gouvernement)"
                                >
                                    <p className="fr-header__service-title">
                                        Aigle <p className="fr-badge fr-badge--green-menthe">BETA</p>
                                    </p>
                                </a>
                                <p className="fr-header__service-tagline">Détection par IA des irrégularités</p>
                                <p className="fr-header__service-tagline">d&apos;occupation du sol</p>
                            </div>
                        </div>

                        <div className={clsx('fr-header__tools', classes['header-tools'])}>
                            <div className={clsx('fr-header__tools-links', classes['tools-links'])}>
                                <ul className="fr-btns-group">
                                    <li>
                                        <a className="fr-btn" href="/map">
                                            <IconMap className={classes['link-icon']} size={16} />
                                            Carte
                                        </a>
                                    </li>
                                    <li>
                                        <a className="fr-btn" href="/statistics">
                                            <IconReportAnalytics className={classes['link-icon']} size={16} />
                                            Stats
                                        </a>
                                    </li>
                                    <li>
                                        <a className="fr-btn" href="/about">
                                            <IconInfoCircle className={classes['link-icon']} size={16} />A propos
                                        </a>
                                    </li>
                                    <li>
                                        <a className="fr-btn" href="/help">
                                            <IconHelp className={classes['link-icon']} size={16} />
                                            Besoin d&apos;aide
                                        </a>
                                    </li>
                                    {userMe?.userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userMe.userRole) ? (
                                        <li>
                                            <a className="fr-btn" href="/admin">
                                                <IconAdjustments className={classes['link-icon']} size={16} />
                                                Admin
                                            </a>
                                        </li>
                                    ) : null}
                                </ul>

                                <ul className="fr-btns-group">
                                    <li>
                                        <a className="fr-btn fr-icon-lock-line" href='/' onClick={() => logout()}>
                                            Se déconnecter
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );

    return (
        <header className={classes.container}>
            <div className="navigation-items">
                {burgerState ? (
                    <Burger
                        opened={burgerState.opened}
                        onClick={burgerState.toggle}
                        hiddenFrom="md"
                        size="sm"
                        mr="md"
                        ml="md"
                    />
                ) : null}

                <Link to={DEFAULT_ROUTE} className={classes['logo-container']}>
                    <Image src={logoSmallImg} alt="Logo Aigle" h="100%" fit="contain" />
                </Link>

                <Tabs
                    className={classes.tabs}
                    ml="xl"
                    value={getTabeValue(pathname)}
                    onChange={(value) => onTabChange(value as TabValue)}
                >
                    <Tabs.List className={classes['tabs-list']}>
                        <Tabs.Tab
                            pl="xl"
                            pr="xl"
                            className={classes.tab}
                            leftSection={<IconMap size={16} />}
                            value="map"
                        >
                            Carte
                        </Tabs.Tab>
                        <Tabs.Tab
                            pl="xl"
                            pr="xl"
                            className={classes.tab}
                            leftSection={<IconReportAnalytics size={16} />}
                            value="statistics"
                        >
                            Stats
                        </Tabs.Tab>
                        <Tabs.Tab
                            pl="xl"
                            pr="xl"
                            className={classes.tab}
                            leftSection={<IconInfoCircle size={16} />}
                            value="about"
                        >
                            A propos
                        </Tabs.Tab>
                        <Tabs.Tab
                            pl="xl"
                            pr="xl"
                            className={classes.tab}
                            leftSection={<IconHelp size={16} />}
                            value="help"
                        >
                            Besoin d&apos;aide
                        </Tabs.Tab>
                        {userMe?.userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userMe.userRole) ? (
                            <Tabs.Tab
                                pl="xl"
                                pr="xl"
                                className={classes.tab}
                                leftSection={<IconAdjustments size={16} />}
                                value="admin"
                            >
                                Admin
                            </Tabs.Tab>
                        ) : null}
                    </Tabs.List>
                </Tabs>
            </div>

            {userMe ? (
                <Menu position="bottom-end">
                    <Menu.Target>
                        <div className={classes['user-infos']}>
                            <div className={classes['user-infos-details']}>
                                <p className={classes['user-infos-details-email']}>{userMe.email}</p>
                                <p className={classes['user-infos-details-role']}>{ROLES_NAMES_MAP[userMe.userRole]}</p>
                            </div>
                            <Avatar className={classes['avatar-button']} color={avatarState.color}>
                                {avatarState.initials}
                            </Avatar>
                        </div>
                    </Menu.Target>

                    <Menu.Dropdown className={classes.menu}>
                        <div className={classes['user-infos']}>
                            <div className={classes['user-infos-details']}>
                                <p className={classes['user-infos-details-email']}>{userMe.email}</p>
                                <p className={classes['user-infos-details-role']}>{ROLES_NAMES_MAP[userMe.userRole]}</p>
                            </div>
                        </div>
                        <Button variant="outline" leftSection={<IconLogout />} onClick={() => logout()}>
                            Déconnexion
                        </Button>
                    </Menu.Dropdown>
                </Menu>
            ) : null}
        </header>
    );
};

export default Component;
